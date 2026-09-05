require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'marketpulse',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Execute a query with parameters.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] ${duration}ms | ${text.substring(0, 80)}`);
    }
    return result;
  } catch (err) {
    console.error(`[DB ERROR] ${err.message} | Query: ${text.substring(0, 80)}`);
    throw err;
  }
}

/**
 * Get a client from the pool for transactions.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
