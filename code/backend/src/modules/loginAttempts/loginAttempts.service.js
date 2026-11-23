// LOGIN ATTEMPTS — kirish urinishlari jurnali (faqat ADMIN). ?page=&limit=&username=&ip=&success=&reason=
// (jadvaldagi ustun nomi tarixan "login" — unda kiritilgan username saqlanadi)
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');

// WRONG_CODE — eski (kod bilan kirish davridagi) yozuvlar uchun
const REASONS = ['SUCCESS', 'WRONG_PASSWORD', 'NO_USER', 'INACTIVE', 'LOCKED', 'CAPTCHA_REQUIRED', 'CAPTCHA_INVALID', 'WRONG_CODE'];

async function list(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const params = [];
  const conds = [];

  const username = String(query.username || '').trim().slice(0, 100);
  if (username) {
    params.push(`%${username}%`);
    conds.push(`login ILIKE $${params.length}`);
  }
  const ip = String(query.ip || '').trim().slice(0, 64);
  if (ip) {
    params.push(ip);
    conds.push(`ip = $${params.length}`);
  }
  if (query.success === 'true' || query.success === 'false') {
    params.push(query.success === 'true');
    conds.push(`success = $${params.length}`);
  }
  if (query.reason) {
    if (!REASONS.includes(query.reason)) throw new HttpError(400, 'Sabab filtri noto\'g\'ri');
    params.push(query.reason);
    conds.push(`reason = $${params.length}`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const total = (await db.query(`SELECT COUNT(*)::int AS n FROM login_attempts ${where}`, params)).rows[0].n;
  params.push(limit, (page - 1) * limit);
  const { rows } = await db.query(
    `SELECT id, login AS username, ip, success, reason, created_at AS "createdAt"
     FROM login_attempts ${where}
     ORDER BY id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { data: rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), reasons: REASONS };
}

module.exports = { list, REASONS };
