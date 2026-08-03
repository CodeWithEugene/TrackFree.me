const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const appsPath = path.join(__dirname, 'apps.json');
const apps = JSON.parse(fs.readFileSync(appsPath, 'utf8')).apps;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'self'; connect-src 'self' https://api.mistral.ai",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
});
app.use(express.json({ limit: '8kb' }));
app.use('/api/admin', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many editor requests. Please try again shortly.' } }));
const publicFiles = new Set(['index.html', 'main.js', 'style.css', 'privacy.html', 'terms.html', 'methodology.html', 'blog.html', 'article.html', 'admin.html', 'blog.js', 'admin.js']);
app.get(['/', ...[...publicFiles].filter((file) => file !== 'index.html').map((file) => `/${file}`)], (req, res) => {
  const file = req.path === '/' ? 'index.html' : req.path.slice(1);
  return res.sendFile(path.join(__dirname, file));
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', catalogueSize: apps.length }));
app.get('/api/apps', (_req, res) => res.json({ apps }));
app.get('/api/apps/:name', (req, res) => {
  const appInfo = findApp(req.params.name);
  if (!appInfo) return res.status(404).json({ error: 'App not found' });
  return res.json(appInfo);
});

app.get('/api/blog/posts', async (_req, res) => {
  try { return res.json({ posts: await getPosts("WHERE status = 'published'", []) }); }
  catch (error) { return databaseError(res, error); }
});
app.get('/api/blog/posts/:slug', async (req, res) => {
  try { const posts = await getPosts("WHERE status = 'published' AND slug = $1", [req.params.slug]); return posts[0] ? res.json(posts[0]) : res.status(404).json({ error: 'Article not found' }); }
  catch (error) { return databaseError(res, error); }
});
app.get('/api/admin/posts', requireAdmin, async (_req, res) => {
  try { return res.json({ posts: await getPosts('', []) }); }
  catch (error) { return databaseError(res, error); }
});
app.post('/api/admin/posts', requireAdmin, async (req, res) => {
  const validation = validatePost(req.body); if (validation) return res.status(400).json({ error: validation });
  try {
    const post = await db.transaction(async (client) => {
      const slug = uniqueSlug(req.body.slug || req.body.title);
      const result = await client.query('INSERT INTO blog_posts (slug, title, summary, body, category, status, author_name, published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6 = \'published\' THEN now() ELSE NULL END) RETURNING *', [slug, req.body.title.trim(), req.body.summary.trim(), req.body.body.trim(), req.body.category.trim(), req.body.status || 'draft', req.body.author_name?.trim() || 'TrackFree Editorial Team']);
      await insertSources(client, result.rows[0].id, req.body.sources || []); return result.rows[0];
    });
    return res.status(201).json({ ...post, sources: req.body.sources || [] });
  } catch (error) { return databaseError(res, error); }
});
app.patch('/api/admin/posts/:id', requireAdmin, async (req, res) => {
  const validation = validatePost(req.body); if (validation) return res.status(400).json({ error: validation });
  try {
    const post = await db.transaction(async (client) => {
      const result = await client.query('UPDATE blog_posts SET title=$2, summary=$3, body=$4, category=$5, status=$6, author_name=$7, slug=$8, published_at=CASE WHEN $6=\'published\' AND published_at IS NULL THEN now() WHEN $6 <> \'published\' THEN NULL ELSE published_at END, updated_at=now() WHERE id=$1 RETURNING *', [req.params.id, req.body.title.trim(), req.body.summary.trim(), req.body.body.trim(), req.body.category.trim(), req.body.status, req.body.author_name?.trim() || 'TrackFree Editorial Team', uniqueSlug(req.body.slug || req.body.title)]);
      if (!result.rows[0]) { const error = new Error('Not found'); error.code = 'NOT_FOUND'; throw error; }
      await client.query('DELETE FROM blog_sources WHERE post_id=$1', [req.params.id]); await insertSources(client, req.params.id, req.body.sources || []); return result.rows[0];
    });
    return res.json({ ...post, sources: req.body.sources || [] });
  } catch (error) { return databaseError(res, error); }
});

app.post('/api/chat', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 500) return res.status(400).json({ error: 'message must be between 1 and 500 characters' });

  const matched = apps.find((item) => message.toLowerCase().includes(item.name.toLowerCase()));
  if (matched) return res.json({ reply: catalogueReply(matched), source: 'catalogue' });
  if (!process.env.MISTRAL_API_KEY) {
    return res.status(404).json({ reply: 'I could not find that app in the reviewed catalogue yet. Try an app listed in the search, or check its official privacy policy.', source: 'catalogue' });
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'You are TrackFree, a privacy-information assistant. Give concise, cautious, educational answers. Do not claim to have verified current policy language, legal status, or data practices unless supplied by the user. Encourage users to check official privacy policies. Never request personal data or give legal advice.' },
          { role: 'user', content: message }
        ]
      })
    });
    if (!response.ok) throw new Error(`Mistral returned ${response.status}`);
    const result = await response.json();
    const reply = result?.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Mistral response had no content');
    return res.json({ reply, source: 'ai' });
  } catch (error) {
    console.error('Chat fallback failed:', error.message);
    return res.status(503).json({ reply: 'The assistant is temporarily unavailable. Please check the app’s official privacy policy directly.', source: 'error' });
  }
});

function findApp(name) {
  const query = decodeURIComponent(name).trim().toLowerCase();
  return apps.find((item) => item.name.toLowerCase() === query || item.name.toLowerCase().includes(query));
}

function catalogueReply(appInfo) {
  return `${appInfo.name} is rated ${appInfo.risk_score} risk (${appInfo.score_count}/10). Its reviewed summary includes: ${appInfo.data_collected.slice(0, 3).join('; ')}. Review the official sources in the app details before making a decision.`;
}

async function getPosts(where, values) {
  const posts = (await db.query(`SELECT id, slug, title, summary, body, category, status, author_name, published_at, created_at, updated_at FROM blog_posts ${where} ORDER BY COALESCE(published_at, created_at) DESC`, values)).rows;
  if (!posts.length) return [];
  const sourceRows = (await db.query('SELECT post_id, label, url FROM blog_sources WHERE post_id = ANY($1::uuid[]) ORDER BY created_at', [posts.map((post) => post.id)])).rows;
  return posts.map((post) => ({ ...post, sources: sourceRows.filter((source) => source.post_id === post.id).map(({ label, url }) => ({ label, url })) }));
}
function requireAdmin(req, res, next) {
  const supplied = req.get('x-admin-token'); const expected = process.env.ADMIN_API_TOKEN;
  const suppliedBuffer = supplied ? Buffer.from(supplied) : null; const expectedBuffer = expected ? Buffer.from(expected) : null;
  if (!expectedBuffer || !suppliedBuffer || suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return res.status(401).json({ error: 'Editor authentication required' });
  return next();
}
function uniqueSlug(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110); }
function validatePost(post) {
  if (!post || !post.title || !post.summary || !post.body || !post.category) return 'title, summary, body, and category are required';
  if (![ 'draft', 'in_review', 'published' ].includes(post.status || 'draft')) return 'Invalid publication status';
  if (post.title.length > 160 || post.summary.length > 320 || post.body.length > 30000) return 'One or more fields are too long';
  if (!Array.isArray(post.sources) || post.sources.some((source) => !source.label || !/^https:\/\//.test(source.url || ''))) return 'Each source needs a label and HTTPS URL';
  if ((post.status === 'in_review' || post.status === 'published') && post.sources.length === 0) return 'Articles in review or published articles need at least one official source';
  return null;
}
async function insertSources(client, postId, sources) { for (const source of sources) await client.query('INSERT INTO blog_sources (post_id, label, url) VALUES ($1,$2,$3)', [postId, source.label.trim(), source.url.trim()]); }
function databaseError(res, error) { if (error.code === 'DATABASE_NOT_CONFIGURED') return res.status(503).json({ error: error.message }); if (error.code === 'NOT_FOUND') return res.status(404).json({ error: error.message }); if (error.code === '23505') return res.status(409).json({ error: 'An article with this URL slug already exists' }); console.error('Blog database error:', error.message); return res.status(500).json({ error: 'The publishing service is temporarily unavailable' }); }

app.listen(port, () => console.log(`TrackFree is running on http://localhost:${port}`));
