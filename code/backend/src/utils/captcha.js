/**
 * O'zimizning CAPTCHA (svg-captcha). Tashqi xizmat yo'q.
 *  - javob bazada HMAC-SHA256(CAPTCHA_SECRET, javob.toLowerCase()) ko'rinishida, 2 daqiqa;
 *  - bir martalik: tekshirilgan zahoti used_at qo'yiladi (to'g'ri yoki noto'g'riligidan qat'i nazar).
 *    UPDATE ... WHERE used_at IS NULL bitta so'rovda bajariladi, ikki parallel so'rov ham bitta captcha'ni
 *    ikki marta ishlata olmaydi.
 */
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const db = require('../config/db');
const { captchaSecret } = require('../config/env');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWER = 20;

function hashAnswer(answer) {
  return crypto.createHmac('sha256', captchaSecret).update(String(answer).trim().toLowerCase()).digest('hex');
}

async function createCaptcha(client = db) {
  const c = svgCaptcha.create({
    size: 5,
    ignoreChars: '0oO1iIlL',
    noise: 3,
    color: true,
    width: 160,
    height: 56,
  });
  const { rows } = await client.query(
    `INSERT INTO captchas (answer_hash, expires_at) VALUES ($1, NOW() + INTERVAL '2 minutes') RETURNING id`,
    [hashAnswer(c.text)]
  );
  return { captchaId: rows[0].id, svg: c.data };
}

/** true — captcha mavjud, muddati o'tmagan, ishlatilmagan va javob to'g'ri */
async function verifyCaptcha(captchaId, answer, client = db) {
  if (typeof captchaId !== 'string' || !UUID_RE.test(captchaId)) return false;
  const { rows } = await client.query(
    `UPDATE captchas SET used_at = NOW()
     WHERE id = $1 AND used_at IS NULL
     RETURNING answer_hash, expires_at > NOW() AS fresh`,
    [captchaId]
  );
  const row = rows[0];
  if (!row || !row.fresh) return false;
  if (typeof answer !== 'string' || !answer.trim() || answer.length > MAX_ANSWER) return false;
  return crypto.timingSafeEqual(Buffer.from(row.answer_hash, 'hex'), Buffer.from(hashAnswer(answer), 'hex'));
}

module.exports = { createCaptcha, verifyCaptcha, hashAnswer };
