/**
 * Boshqaruv ierarxiyasi (service qatlamida majburiy — frontend faqat qulaylik uchun yashiradi):
 *  - ADMIN    — barcha turdagi role va userlarni boshqaradi;
 *  - DIRECTOR — faqat MANAGER turidagi role va userlarni;
 *  - MANAGER  — boshqaruv API'siga umuman kira olmaydi (route'da requireRoleType).
 *  - Oxirgi faol ADMIN bloklanmaydi va ADMIN'likdan chiqarilmaydi.
 */
const HttpError = require('../../utils/httpError');

function canManageType(actor, type) {
  if (!actor) return false;
  if (actor.roleType === 'ADMIN') return true;
  if (actor.roleType === 'DIRECTOR') return type === 'MANAGER';
  return false;
}

function assertCanManage(actor, type) {
  if (!canManageType(actor, type)) {
    throw new HttpError(403, 'Bu turdagi role yoki xodim ustida amal bajara olmaysiz', undefined, 'FORBIDDEN',
      { requiredRoleType: type === 'MANAGER' ? ['ADMIN', 'DIRECTOR'] : ['ADMIN'] });
  }
}

/**
 * excludeUserIds / excludeRoleId dan tashqarida yana kamida bitta faol ADMIN qoladimi.
 * Qatorlar qulflanadi (FOR UPDATE) — ikki admin bir vaqtda bir-birini bloklay olmasin.
 */
async function assertAnotherActiveAdmin(client, { excludeUserId = null, excludeRoleId = null } = {}) {
  const { rows } = await client.query(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.type = 'ADMIN' AND u.is_active AND u.login IS NOT NULL AND u.code_hash IS NOT NULL
       AND ($1::int IS NULL OR u.id <> $1) AND ($2::int IS NULL OR r.id <> $2)
     FOR UPDATE OF u`,
    [excludeUserId, excludeRoleId]
  );
  if (!rows.length) {
    throw new HttpError(409, 'Bu oxirgi faol administrator. Avval boshqa administrator tayinlang', undefined, 'LAST_ADMIN');
  }
}

module.exports = { canManageType, assertCanManage, assertAnotherActiveAdmin };
