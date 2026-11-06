// PostgreSQL ulanishi (connection pool)
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'qurilish_dokoni',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
});

// NUMERIC ustunlarni JS'da son sifatida olish (default'da string keladi)
require('pg').types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

/** Oddiy so'rov */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Tranzaksiya: ichidagi barcha so'rovlar yoki birga bajariladi, yoki birortasi ham bajarilmaydi.
 * Masalan: ombor harakati yozilib, mahsulot qoldig'i yangilanmay qolishi mumkin emas.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
