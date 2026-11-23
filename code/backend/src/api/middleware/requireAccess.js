/**
 * requireAccess(...codes) — ro'yxatdagi BARCHA access'lar kerak.
 * requireAnyAccess(...codes) — kamida bittasi yetarli.
 *
 *  - ADMIN va DIRECTOR — to'liq huquq, tekshiruvsiz o'tadi.
 *  - MANAGER — bitta SQL so'rov bilan role_accesses dan tekshiriladi. Access'lar tokenda emas,
 *    har so'rovda bazadan olinadi: director huquq bersa yoki olsa, qayta login'siz darhol ta'sir qiladi.
 * Yo'q bo'lsa: 403 { error: { code: 'FORBIDDEN', requiredAccess: [...] } }
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const asyncHandler = require('./asyncHandler');

const FULL_ACCESS_TYPES = ['ADMIN', 'DIRECTOR'];

const hasFullAccess = (user) => Boolean(user) && FULL_ACCESS_TYPES.includes(user.roleType);

/** Xodimda shu kodlardan qaysilari bor (to'plam) */
async function grantedCodes(user, codes) {
  if (hasFullAccess(user)) return new Set(codes);
  const { rows } = await db.query(
    `SELECT a.code FROM role_accesses ra JOIN accesses a ON a.id = ra.access_id
     WHERE ra.role_id = $1 AND a.code = ANY($2::text[])`,
    [user.roleId, codes]
  );
  return new Set(rows.map((r) => r.code));
}

function forbidden(codes) {
  return new HttpError(403, 'Bu amal uchun sizda huquq yo\'q', undefined, 'FORBIDDEN', { requiredAccess: codes });
}

/** Service/route ichidan chaqirish uchun: huquq bo'lmasa 403 throw qiladi */
async function assertAccess(user, codes, mode = 'all') {
  if (!user) throw new HttpError(401, 'Avval tizimga kiring');
  const granted = await grantedCodes(user, codes);
  const ok = mode === 'any' ? codes.some((c) => granted.has(c)) : codes.every((c) => granted.has(c));
  if (!ok) throw forbidden(codes);
}

const requireAccess = (...codes) => asyncHandler(async (req, res, next) => {
  await assertAccess(req.user, codes, 'all');
  next();
});

const requireAnyAccess = (...codes) => asyncHandler(async (req, res, next) => {
  await assertAccess(req.user, codes, 'any');
  next();
});

module.exports = { requireAccess, requireAnyAccess, assertAccess, hasFullAccess, FULL_ACCESS_TYPES };
