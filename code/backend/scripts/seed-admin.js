/**
 * Boshlang'ich admin:  npm run db:seed-admin [-- --reset] [-- --only-with-env]
 *   ADMIN_USERNAME         — username (bo'sh bo'lsa: admin)
 *   ADMIN_INITIAL_PASSWORD — vaqtinchalik parol (kamida 8 belgi, harf + raqam). Bo'sh bo'lsa tasodifiy
 *                            parol generatsiya qilinadi va konsolga BIR MARTA chiqariladi — darhol saqlab oling.
 *
 *   (flagsiz)        shu username bilan xodim bor bo'lsa — hech narsa o'zgartirilmaydi;
 *   --reset          bor bo'lsa — parolini env'dagi (yoki yangi generatsiya qilingan) parolga almashtiradi,
 *                    must_change_password = true, qulf olinadi, faollashtiriladi, barcha sessiyalar yopiladi;
 *   --only-with-env  ADMIN_INITIAL_PASSWORD berilmagan bo'lsa hech narsa qilmaydi (Render start'i uchun —
 *                    generatsiya qilingan parol logga tushmasligi uchun).
 * Har holda admin birinchi kirishda parolni o'zgartirishi shart. Bazada faqat bcrypt hash saqlanadi.
 */
require('dotenv').config();
const { Client } = require('pg');
const { connectionConfig } = require('../src/config/db');
const {
  normalizeUsername, isValidUsername, passwordProblem, generatePassword, hashPassword,
} = require('../src/utils/password');

async function seedAdmin(client, { reset = false, onlyWithEnv = false, log = console.log } = {}) {
  const username = normalizeUsername(process.env.ADMIN_USERNAME || process.env.ADMIN_LOGIN || 'admin');
  if (!isValidUsername(username)) throw new Error('ADMIN_USERNAME: 3–32 belgi, faqat a-z, 0-9, _ va .');

  const given = process.env.ADMIN_INITIAL_PASSWORD || '';
  if (onlyWithEnv && !given) {
    log('ℹ️  ADMIN_INITIAL_PASSWORD berilmagan — admin yaratilmadi (--only-with-env)');
    return null;
  }
  if (given) {
    const problem = passwordProblem(given, username);
    if (problem) throw new Error(`ADMIN_INITIAL_PASSWORD: ${problem}`);
  }

  const existing = (await client.query('SELECT id FROM users WHERE LOWER(username) = $1', [username])).rows[0];
  if (existing && !reset) {
    log(`ℹ️  "${username}" allaqachon mavjud — o'zgartirilmadi (parolni almashtirish: npm run db:seed-admin -- --reset)`);
    return null;
  }

  const password = given || generatePassword();
  const passwordHash = await hashPassword(password);

  if (existing) {
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE users SET password_hash = $1, must_change_password = TRUE, token_version = token_version + 1,
           failed_attempts = 0, locked_until = NULL, is_active = TRUE, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, existing.id]
      );
      await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [existing.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    log(`✅ "${username}" paroli almashtirildi, barcha sessiyalar yopildi.`);
  } else {
    const role = (await client.query("SELECT id FROM roles WHERE type = 'ADMIN' ORDER BY id LIMIT 1")).rows[0];
    if (!role) throw new Error('ADMIN turidagi role topilmadi. Avval: npm run db:migrate');
    await client.query(
      `INSERT INTO users (full_name, username, password_hash, must_change_password, role_id, is_active)
       VALUES ($1, $2, $3, TRUE, $4, TRUE)`,
      ['Administrator', username, passwordHash, role.id]
    );
    log(`✅ Admin yaratildi. Username: ${username}`);
  }

  if (given) log('🔑 Parol: ADMIN_INITIAL_PASSWORD dagi qiymat. Birinchi kirishda uni almashtirasiz.');
  else log(`🔑 Vaqtinchalik parol: ${password}   <- faqat hozir ko'rsatiladi, saqlab oling`);
  return { username, password, reset: Boolean(existing) };
}

module.exports = { seedAdmin };

if (require.main === module) {
  (async () => {
    const client = new Client(connectionConfig());
    await client.connect();
    try {
      await seedAdmin(client, {
        reset: process.argv.includes('--reset'),
        onlyWithEnv: process.argv.includes('--only-with-env'),
      });
    } finally {
      await client.end();
    }
  })().catch((err) => {
    console.error('❌ Xato:', err.message);
    process.exit(1);
  });
}
