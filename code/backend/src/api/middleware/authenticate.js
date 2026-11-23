/**
 * authenticate — "Authorization: Bearer <access token>" ni tekshiradi va xodimni BAZADAN oladi.
 * Token imzosi to'g'ri bo'lsa ham, xodim bloklangan (is_active=false), qulflangan (locked_until)
 * yoki o'chirilgan bo'lsa — darhol 401. Natija: req.user = { id, fullName, login, roleId, roleName, roleType }
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const { verifyAccessToken } = require('../../utils/tokens');
const asyncHandler = require('./asyncHandler');

const STAFF_SELECT = `
  SELECT u.id, u.full_name, u.login, u.is_active, u.locked_until,
         r.id AS role_id, r.name AS role_name, r.type AS role_type
  FROM users u JOIN roles r ON r.id = u.role_id`;

function isBlocked(row) {
  return !row.is_active || (row.locked_until && new Date(row.locked_until) > new Date());
}

function toStaff(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    login: row.login,
    roleId: row.role_id,
    roleName: row.role_name,
    roleType: row.role_type,
  };
}

/** Faol xodimni id bo'yicha oladi; topilmasa yoki bloklangan bo'lsa — null */
async function loadActiveStaff(id, client = db) {
  const { rows } = await client.query(`${STAFF_SELECT} WHERE u.id = $1 AND u.login IS NOT NULL`, [id]);
  const row = rows[0];
  return row && !isBlocked(row) ? toStaff(row) : null;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Avval tizimga kiring', undefined, 'UNAUTHORIZED');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new HttpError(401, expired ? 'Sessiya muddati tugadi' : 'Token noto\'g\'ri', undefined,
      expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID');
  }

  const id = Number(payload.sub);
  const user = Number.isInteger(id) && id > 0 ? await loadActiveStaff(id) : null;
  if (!user) throw new HttpError(401, 'Foydalanuvchi topilmadi yoki bloklangan', undefined, 'UNAUTHORIZED');

  req.user = user;
  next();
});

module.exports = { authenticate, loadActiveStaff, isBlocked, toStaff, STAFF_SELECT };
