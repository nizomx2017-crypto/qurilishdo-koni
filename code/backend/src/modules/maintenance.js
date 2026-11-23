// Davriy tozalash: muddati o'tgan captcha va refresh tokenlar, eski kirish jurnali
const db = require('../config/db');

async function cleanupExpired() {
  const captchas = await db.query(
    `DELETE FROM captchas WHERE expires_at < NOW() - INTERVAL '10 minutes'`
  );
  // Bekor qilingan tokenlar muddati tugaguncha saqlanadi — qayta ishlatilsa o'g'irlikni aniqlash uchun
  const tokens = await db.query(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '1 day'`
  );
  const attempts = await db.query(
    `DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '90 days'`
  );
  return { captchas: captchas.rowCount, tokens: tokens.rowCount, attempts: attempts.rowCount };
}

module.exports = { cleanupExpired };
