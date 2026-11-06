/**
 * Bazani bir buyruq bilan tayyorlash:  npm run db:init
 *  1) qurilish_dokoni bazasi bo'lmasa — yaratadi
 *  2) code/database/schema/*.sql ni bajaradi (jadvallar)
 *  3) code/database/seed/*.sql ni bajaradi (namunaviy ma'lumotlar)
 * DIQQAT: mavjud jadvallar o'chirilib, qaytadan yaratiladi!
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};
const dbName = process.env.DB_NAME || 'qurilish_dokoni';
const dbDir = path.join(__dirname, '..', '..', 'database');

function sqlFiles(sub) {
  const dir = path.join(dbDir, sub);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f));
}

(async () => {
  const admin = new Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`🆕 Baza yaratildi: ${dbName}`);
  }
  await admin.end();

  const client = new Client({ ...cfg, database: dbName });
  await client.connect();
  for (const file of [...sqlFiles('schema'), ...sqlFiles('seed')]) {
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log(`✔ ${path.relative(dbDir, file)}`);
  }
  await client.end();
  console.log('✅ Baza tayyor');
})().catch((err) => {
  console.error('❌ Xato:', err.message);
  process.exit(1);
});
