/**
 * authenticate — "Authorization: Bearer <access token>" ni tekshiradi va xodimni BAZADAN oladi.
 *  - imzo to'g'ri bo'lsa ham: bloklangan (is_active=false), qulflangan (locked_until), o'chirilgan
 *    yoki token versiyasi eskirgan (parol o'zgargan/tiklangan) bo'lsa — darhol 401;
 *  - must_change_password = true bo'lsa — 403 PASSWORD_CHANGE_REQUIRED.
 *    Faqat authenticateAllowingPasswordChange ishlatilgan marshrutlar (/auth/me, /auth/change-password) ochiq.
 * Natija: req.user = { id, fullName, username, roleId, roleName, roleType, tokenVersion, mustChangePassword }
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const { verifyAccessToken } = require('../../utils/tokens');
const asyncHandler = require('./asyncHandler');

const STAFF_SELECT = `
  SELECT u.id, u.full_name, u.username, u.is_active, u.locked_until, u.token_version, u.must_change_password,
         r.id AS role_id, r.name AS role_name, r.type AS role_type
  FROM users u JOIN roles r ON r.id = u.role_id`;

function isBlocked(row) {
  return !row.is_active || (row.locked_until && new Date(row.locked_until) > new Date());
}

function toStaff(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    roleId: row.role_id,
    roleName: row.role_name,
    roleType: row.role_type,
    tokenVersion: row.token_version,
    mustChangePassword: row.must_change_password,
  };
}

/** Faol xodimni id bo'yicha oladi; topilmasa yoki bloklangan bo'lsa — null */
async function loadActiveStaff(id, client = db) {
  const { rows } = await client.query(`${STAFF_SELECT} WHERE u.id = $1 AND u.username IS NOT NULL`, [id]);
  const row = rows[0];
  return row && !isBlocked(row) ? toStaff(row) : null;
}

function makeAuthenticate({ allowPasswordChange }) {
  return asyncHandler(async (req, res, next) => {
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
    if (payload.tv !== user.tokenVersion) {
      throw new HttpError(401, 'Parol o\'zgargani uchun sessiya yopildi. Qaytadan kiring', undefined, 'TOKEN_REVOKED');
    }
    if (user.mustChangePassword && !allowPasswordChange) {
      throw new HttpError(403, 'Avval parolingizni o\'zgartiring', undefined, 'PASSWORD_CHANGE_REQUIRED');
    }

    req.user = user;
    next();
  });
}

const authenticate = makeAuthenticate({ allowPasswordChange: false });
const authenticateAllowingPasswordChange = makeAuthenticate({ allowPasswordChange: true });

module.exports = {
  authenticate, authenticateAllowingPasswordChange, loadActiveStaff, isBlocked, toStaff, STAFF_SELECT,
};
