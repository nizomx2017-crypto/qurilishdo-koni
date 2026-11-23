/**
 * Bazani noldan tayyorlash:  npm run db:init
 *  1) lokal rejimda (DATABASE_URL yo'q) baza bo'lmasa — yaratadi
 *  2) code/database/schema/*.sql   (jadvallar)
 *  3) code/database/seed/*.sql     (namunaviy ma'lumotlar)
 *  4) code/database/migrations/*.sql (db:migrate bilan bir xil)
 *  5) boshlang'ich admin (db:seed-admin bilan bir xil)
 * DIQQAT: mavjud jadvallar o'chirilib, qaytadan yaratiladi!
 * Shuning uchun NODE_ENV=production da faqat --force bilan ishlaydi.
 * Ishlab turgan bazani yangilash uchun: npm run db:migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { connectionConfig } = require('../src/config/db');
const { runMigrations } = require('./db-migrate');
const { seedAdmin } = require('./seed-admin');

const dbDir = path.join(__dirname, '..', '..', 'database');

function sqlFiles(sub) {
  const dir = path.join(dbDir, sub);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f));
}

async function ensureLocalDatabase(dbName) {
  if (process.env.DATABASE_URL) return;
  const admin = new Client(connectionConfig('postgres'));
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
    console.log(`🆕 Baza yaratildi: ${dbName}`);
  }
  await admin.end();
}

/** Bazani noldan quradi. Testlar ham shuni ishlatadi. */
async function resetDatabase({ log = console.log, withAdmin = true } = {}) {
  const dbName = process.env.DB_NAME || 'qurilish_dokoni';
  await ensureLocalDatabase(dbName);

  const client = new Client(connectionConfig());
  await client.connect();
  try {
    for (const file of [...sqlFiles('schema'), ...sqlFiles('seed')]) {
      await client.query(fs.readFileSync(file, 'utf8'));
      log(`✔ ${path.relative(dbDir, file)}`);
    }
    await runMigrations(client, log);
    if (withAdmin) await seedAdmin(client, log);
  } finally {
    await client.end();
  }
}

module.exports = { resetDatabase };

if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('❌ NODE_ENV=production: db:init barcha jadvallarni o\'chiradi. Bazani yangilash uchun npm run db:migrate ishlating.');
    console.error('   Baribir noldan qurmoqchi bo\'lsangiz: npm run db:init -- --force');
    process.exit(1);
  }
  resetDatabase()
    .then(() => {
      console.log('✅ Baza tayyor');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Xato:', err.message);
      process.exit(1);
    });
}
