// PostgreSQL ulanishi (connection pool)
//  - DATABASE_URL berilsa (masalan Supabase), shu ishlatiladi;
//  - aks holda lokal DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD.
const { Pool, types } = require('pg');

// NUMERIC ustunlarni JS'da son sifatida olish (default'da string keladi)
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

/**
 * SSL kerakmi? DB_SSL=true|false aniq yozilsa — shunisi.
 * Yozilmasa: DATABASE_URL'da supabase bo'lsa yoqiladi, lokal bazada o'chiq.
 * Supabase pooler sertifikati o'z-o'zidan imzolangan, shuning uchun rejectUnauthorized: false.
 */
function sslOption(url) {
  const flag = String(process.env.DB_SSL || '').toLowerCase();
  const enabled = flag ? flag === 'true' : /supabase\.(co|com)/.test(url || '');
  return enabled ? { rejectUnauthorized: false } : false;
}

/** Ulanish sozlamalari. database berilsa — shu baza nomi bilan (faqat lokal rejimda). */
function connectionConfig(database) {
  const url = process.env.DATABASE_URL;
  if (url) return { connectionString: url, ssl: sslOption(url) };
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: database || process.env.DB_NAME || 'qurilish_dokoni',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: sslOption(''),
  };
}

const pool = new Pool({ ...connectionConfig(), max: Number(process.env.DB_POOL_MAX || 10) });

/** Oddiy so'rov */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Tranzaksiya: ichidagi barcha so'rovlar yoki birga bajariladi, yoki birortasi ham bajarilmaydi.
 * Masalan: buyurtma yozilib, mahsulot qoldig'i kamaymay qolishi mumkin emas.
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

module.exports = { pool, query, withTransaction, connectionConfig };
