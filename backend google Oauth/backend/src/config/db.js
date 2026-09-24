// A "pool" keeps a handful of open database connections ready to reuse,
// instead of opening a brand new connection for every request (slow).
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  // A background/idle client crashed — log it, don't crash the whole server.
  console.error('Unexpected database error', err);
});

module.exports = {
  // Simple one-off query: db.query('SELECT * FROM items WHERE id = $1', [id])
  query: (text, params) => pool.query(text, params),

  // For flows that must succeed or fail together (e.g. approving a claim
  // touches both `claims` and `items` — either both change or neither does).
  getClient: () => pool.connect(),
};
