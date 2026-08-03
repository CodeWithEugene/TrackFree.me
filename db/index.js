const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined }) : null;

async function query(text, values) {
  if (!pool) {
    const error = new Error('The blog database is not configured. Set DATABASE_URL and run npm run db:migrate.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return pool.query(text, values);
}

async function transaction(callback) {
  if (!pool) return query();
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await callback(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { query, transaction, configured: Boolean(pool) };
