/**
 * Migratsiyalar:  npm run db:migrate
 * code/database/migrations/*.sql fayllarini nom tartibida, faqat hali bajarilmaganlarini bajaradi.
 * Bajarilganlari schema_migrations jadvalida eslab qolinadi. Hech narsa o'chirilmaydi —
 * ishlab turgan bazada (Supabase) ham xavfsiz. Fayllarning o'zi ham idempotent yozilgan.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { connectionConfig } = require('../src/config/db');

const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');

async function runMigrations(client, log = console.log) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(200) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (done.has(file)) continue;
    try {
      await client.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`${file}: ${err.message}`);
    }
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
    log(`✔ migrations/${file}`);
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  (async () => {
    const client = new Client(connectionConfig());
    await client.connect();
    await runMigrations(client);
    await client.end();
    console.log('✅ Migratsiyalar bajarildi');
  })().catch((err) => {
    console.error('❌ Xato:', err.message);
    process.exit(1);
  });
}
