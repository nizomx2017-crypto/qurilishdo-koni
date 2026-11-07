/**
 * Bazani bir buyruq bilan tayyorlash:  npm run db:init
 *  1) lokal rejimda (DATABASE_URL yo'q) baza bo'lmasa — yaratadi
 *  2) code/database/schema/*.sql ni bajaradi (jadvallar)
 *  3) code/database/seed/*.sql ni bajaradi (namunaviy ma'lumotlar)
 * DIQQAT: mavjud jadvallar o'chirilib, qaytadan yaratiladi!
 * Supabase'da baza tayyor bo'ladi — faqat DATABASE_URL yozilsa yetarli.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { connectionConfig } = require('../src/config/db');

const dbDir = path.join(__dirname, '..', '..', 'database');

function sqlFiles(sub) {
  const dir = path.join(dbDir, sub);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f));
}

async function ensureLocalDatabase() {
  if (process.env.DATABASE_URL) return;
  const dbName = process.env.DB_NAME || 'qurilish_dokoni';
  const admin = new Client(connectionConfig('postgres'));
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`🆕 Baza yaratildi: ${dbName}`);
  }
  await admin.end();
}

(async () => {
  await ensureLocalDatabase();

  const client = new Client(connectionConfig());
  await client.connect();
  for (const file of [...sqlFiles('schema'), ...sqlFiles('seed')]) {
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log(`✔ ${path.relative(dbDir, file)}`);
  }
  await client.end();
  console.log('✅ Baza tayyor');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Xato:', err.message);
  process.exit(1);
});
