/**
 * Autentifikatsiya va ruxsat:
 *   authenticate — "Authorization: Bearer <token>" ni tekshiradi, req.user ni to'ldiradi
 *   requireAdmin — faqat admin roli o'tadi
 * Token har so'rovda bazadagi foydalanuvchi bilan solishtiriladi: bloklangan (inactive)
 * yoki o'chirilgan foydalanuvchi eski token bilan ham kira olmaydi.
 */
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { jwtSecret } = require('../../config/env');
const HttpError = require('../../utils/httpError');

async function authenticate(req, res, next) {
  try {
    const [scheme, token] = String(req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Avval tizimga kiring');

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      throw new HttpError(401, 'Sessiya muddati tugagan yoki token noto\'g\'ri. Qaytadan kiring');
    }

    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || user.status !== 'active') throw new HttpError(401, 'Foydalanuvchi topilmadi yoki bloklangan');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new HttpError(403, 'Bu amal faqat admin uchun'));
  }
  next();
}

module.exports = { authenticate, requireAdmin };
