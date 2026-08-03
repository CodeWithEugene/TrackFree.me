const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to run migrations.');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
    console.log('Database schema is ready.');
  } finally { await client.end(); }
})().catch((error) => { console.error(error.message); process.exit(1); });
