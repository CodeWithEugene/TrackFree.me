const state = { apps: [] };
const aliases = { twitter: 'X (formerly Twitter)', x: 'X (formerly Twitter)', facebook: 'Facebook (Meta)' };

function node(tag, text, className) { const item = document.createElement(tag); if (text) item.textContent = text; if (className) item.className = className; return item; }
function findApp(query) { const value = aliases[query.toLowerCase()] || query; return state.apps.find((app) => app.name.toLowerCase() === value.toLowerCase()) || state.apps.find((app) => app.name.toLowerCase().includes(value.toLowerCase())); }
function riskTone(risk) { return { Low: 'low-risk', Medium: 'medium-risk', High: 'high-risk' }[risk] || ''; }

function renderApp(app) {
  document.getElementById('app-results').classList.remove('hidden');
  document.getElementById('app-name').textContent = app.name;
  const risk = document.getElementById('risk-score'); risk.replaceChildren('Privacy signal: ', node('span', app.risk_score, riskTone(app.risk_score)), document.createTextNode(' — a guide, not a verdict.'));
  document.getElementById('score-number').textContent = app.score_count;
  document.getElementById('data-collected').replaceChildren(...app.data_collected.slice(0, 7).map((item) => node('li', item)));
  document.getElementById('opt-out-delete').textContent = app.opt_out_or_delete;
  document.getElementById('app-sources').replaceChildren(...app.sources.map((url, index) => { const link = node('a', `Official source ${index + 1}`); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; const item = node('li'); item.append(link); return item; }));
  document.getElementById('app-review-date').textContent = 'Check the official links for the newest policy details.';
  document.getElementById('app-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function search() { const value = document.getElementById('app-search').value.trim(); if (!value) return; const app = findApp(value); if (app) renderApp(app); else { document.getElementById('app-results').classList.add('hidden'); document.getElementById('search-status').textContent = 'Not in the reviewed catalogue yet. Try another app or use the official privacy policy.'; } }
function populateComparison() { for (const id of ['compare-a', 'compare-b']) { const select = document.getElementById(id); select.replaceChildren(...state.apps.map((app) => new Option(app.name, app.name))); } document.getElementById('compare-b').selectedIndex = Math.min(1, state.apps.length - 1); }
function comparisonRow(label, value, different) { const row = node('div', '', `comparison-row${different ? ' comparison-difference' : ''}`); row.append(node('span', label), node('b', value)); return row; }
function compare() {
  const container = document.getElementById('compare-results');
  const [first, second] = ['compare-a', 'compare-b'].map((id) => findApp(document.getElementById(id).value));
  const differences = { risk: first.risk_score !== second.risk_score, score: first.score_count !== second.score_count, collection: first.data_collected.length !== second.data_collected.length, sources: first.sources.length !== second.sources.length };
  container.replaceChildren(...[first, second].map((app, index) => {
    const card = node('article', '', 'compare-card compare-card-enter');
    const detail = node('div', '', 'comparison-rows');
    detail.append(
      comparisonRow('Privacy signal', `${app.risk_score}`, differences.risk),
      comparisonRow('Signal score', `${app.score_count} / 10`, differences.score),
      comparisonRow('Data areas named', `${app.data_collected.length}`, differences.collection),
      comparisonRow('Official sources', `${app.sources.length}`, differences.sources)
    );
    card.append(node('p', index === 0 ? 'App A' : 'App B', 'note-label'), node('h3', app.name), detail, node('p', 'A policy summary:', 'compare-caption'), node('p', app.shared_or_sold, 'compare-summary'));
    return card;
  }));
  container.classList.remove('hidden');
  container.setAttribute('aria-live', 'polite');
}
function addMessage(label, content) { const messages = document.getElementById('chatbot-messages'); const row = node('div'); row.append(node('b', `${label}: `), document.createTextNode(content)); messages.append(row); messages.scrollTop = messages.scrollHeight; return row; }

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  try { const response = await fetch('/api/apps'); state.apps = (await response.json()).apps; populateComparison(); } catch (_) { document.getElementById('search-status').textContent = 'The app catalogue is unavailable. Please refresh later.'; }
  document.getElementById('app-search-button').addEventListener('click', search); document.getElementById('app-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }); document.querySelectorAll('.quick-app').forEach((button) => button.addEventListener('click', () => { document.getElementById('app-search').value = button.dataset.app; search(); }));
  document.getElementById('compare-button').addEventListener('click', compare);
  document.getElementById('compare-b').addEventListener('change', () => { if (!document.getElementById('compare-results').classList.contains('hidden')) compare(); });
  const toggle = document.getElementById('chatbot-toggle'); toggle.addEventListener('click', () => { const box = document.getElementById('chatbot-box'); box.classList.toggle('hidden'); toggle.setAttribute('aria-expanded', String(!box.classList.contains('hidden'))); if (!box.classList.contains('hidden')) document.getElementById('chatbot-input').focus(); });
  document.getElementById('chatbot-form').addEventListener('submit', async (event) => { event.preventDefault(); const input = document.getElementById('chatbot-input'); const message = input.value.trim(); if (!message) return; addMessage('You', message); input.value = ''; const pending = addMessage('TrackFree', 'Thinking…'); try { const result = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }); const data = await result.json(); pending.replaceWith(addMessage('TrackFree', data.reply || 'Sorry, something went wrong.')); } catch (_) { pending.replaceWith(addMessage('TrackFree', 'Sorry, the assistant is unavailable right now.')); } });
});
