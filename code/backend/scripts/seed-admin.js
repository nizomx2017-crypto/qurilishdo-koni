/**
 * Boshlang'ich admin:  npm run db:seed-admin
 *   ADMIN_LOGIN        — login (bo'sh bo'lsa: admin)
 *   ADMIN_INITIAL_CODE — kod (XXXX-XXXX). Bo'sh bo'lsa tasodifiy kod yaratiladi va konsolga
 *                        BIR MARTA chiqariladi — darhol saqlab oling.
 * Shu login bilan foydalanuvchi bor bo'lsa — hech narsa o'zgartirilmaydi (kod qayta o'rnatilmaydi).
 * Bazada faqat bcrypt hash saqlanadi.
 */
require('dotenv').config();
const { Client } = require('pg');
const { connectionConfig } = require('../src/config/db');
const { generateCode, normalizeCode, formatCode, hashCode, isValidCodeFormat } = require('../src/utils/code');

const LOGIN_RE = /^[a-zA-Z0-9._-]{3,50}$/;

async function seedAdmin(client, log = console.log) {
  const login = String(process.env.ADMIN_LOGIN || 'admin').trim();
  if (!LOGIN_RE.test(login)) throw new Error('ADMIN_LOGIN: 3–50 belgi, faqat harf, raqam, . _ -');

  const exists = await client.query('SELECT id FROM users WHERE LOWER(login) = LOWER($1)', [login]);
  if (exists.rowCount) {
    log(`ℹ️  "${login}" allaqachon mavjud — o'zgartirilmadi`);
    return null;
  }

  const role = (await client.query("SELECT id FROM roles WHERE type = 'ADMIN' ORDER BY id LIMIT 1")).rows[0];
  if (!role) throw new Error('ADMIN turidagi role topilmadi. Avval: npm run db:migrate');

  const given = process.env.ADMIN_INITIAL_CODE;
  if (given && !isValidCodeFormat(given)) {
    throw new Error('ADMIN_INITIAL_CODE formati: XXXX-XXXX (harflar A–Z va raqamlar 2–9, 0/O/1/I/L siz)');
  }
  const code = given ? formatCode(normalizeCode(given)) : generateCode();

  await client.query(
    `INSERT INTO users (full_name, login, code_hash, role_id, is_active)
     VALUES ($1, $2, $3, $4, TRUE)`,
    ['Administrator', login, await hashCode(code), role.id]
  );

  log(`✅ Admin yaratildi. Login: ${login}`);
  if (!given) {
    log(`🔑 Kod: ${code}   <- faqat hozir ko'rsatiladi, saqlab oling`);
  } else {
    log('🔑 Kod: ADMIN_INITIAL_CODE dagi qiymat. Kirgandan keyin uni panelda yangilang.');
  }
  return { login, code };
}

module.exports = { seedAdmin };

if (require.main === module) {
  (async () => {
    const client = new Client(connectionConfig());
    await client.connect();
    await seedAdmin(client);
    await client.end();
  })().catch((err) => {
    console.error('❌ Xato:', err.message);
    process.exit(1);
  });
}
