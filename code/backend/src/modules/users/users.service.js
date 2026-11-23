/**
 * USERS — xodimlarni boshqarish (faqat ADMIN va DIRECTOR; ierarxiya hierarchy.js da).
 *  - xodim o'zi ro'yxatdan o'tmaydi, uni admin/direktor username, ism, role va VAQTINCHALIK parol bilan yaratadi
 *    (parol berilmasa — server 12 belgili parol generatsiya qiladi va javobda BIR MARTA qaytaradi);
 *  - vaqtinchalik parol bilan kirgan xodim avval parolini o'zgartirishi shart (must_change_password);
 *  - reset-password: yangi vaqtinchalik parol, token_version++ va barcha sessiyalar yopiladi;
 *  - hech kim o'zini bloklay olmaydi va o'z role'ini o'zgartira olmaydi.
 * password_hash hech qachon javobga chiqmaydi.
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const {
  normalizeUsername, isValidUsername, passwordProblem, generatePassword, hashPassword,
} = require('../../utils/password');
const { revokeAllSessions } = require('../auth/auth.service');
const { assertCanManage, assertAnotherActiveAdmin, canManageType } = require('./hierarchy');

const ROLE_TYPES = ['ADMIN', 'DIRECTOR', 'MANAGER'];
const USERNAME_HINT = 'Username 3–32 belgi: a-z, 0-9, _ va .';

const USER_SELECT = `
  SELECT u.id, u.full_name, u.username, u.is_active, u.failed_attempts, u.locked_until,
         u.must_change_password, u.password_changed_at, u.created_at, u.updated_at,
         r.id AS role_id, r.name AS role_name, r.type AS role_type,
         c.full_name AS created_by_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN users c ON c.id = u.created_by`;

function toDto(row, actor) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    isActive: row.is_active,
    lockedUntil: row.locked_until && new Date(row.locked_until) > new Date() ? row.locked_until : null,
    failedAttempts: row.failed_attempts,
    mustChangePassword: row.must_change_password,
    passwordChangedAt: row.password_changed_at,
    role: { id: row.role_id, name: row.role_name, type: row.role_type },
    createdBy: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manageable: canManageType(actor, row.role_type),
    isSelf: Boolean(actor) && actor.id === row.id,
  };
}

// --------------------------------------------------------------- validatsiya

function readBody(body, { partial }) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const errors = {};

  if (b.fullName !== undefined || !partial) {
    const v = typeof b.fullName === 'string' ? b.fullName.trim() : '';
    if (v.length < 2 || v.length > 150) errors.fullName = 'F.I.Sh. 2–150 belgi bo\'lsin';
    else out.fullName = v;
  }
  if (b.username !== undefined || !partial) {
    const v = normalizeUsername(b.username);
    if (!isValidUsername(v)) errors.username = USERNAME_HINT;
    else out.username = v;
  }
  if (b.roleId !== undefined || !partial) {
    const v = Number(b.roleId);
    if (!Number.isInteger(v) || v <= 0 || v > 2147483647) errors.roleId = 'Role tanlang';
    else out.roleId = v;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Ma\'lumotlar noto\'g\'ri to\'ldirilgan', errors);
  return out;
}

/** Vaqtinchalik parol: berilgan bo'lsa siyosat bo'yicha tekshiriladi, berilmasa generatsiya qilinadi */
function temporaryPassword(raw, username) {
  if (raw === undefined || raw === null || raw === '') return { password: generatePassword(), generated: true };
  const problem = passwordProblem(raw, username);
  if (problem) throw new HttpError(400, problem, { password: problem }, 'WEAK_PASSWORD');
  return { password: raw, generated: false };
}

async function getRole(client, id) {
  const { rows } = await client.query('SELECT id, name, type FROM roles WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(400, 'Role topilmadi', { roleId: 'Role topilmadi' });
  return rows[0];
}

async function lockTarget(client, id) {
  const { rows } = await client.query(
    `SELECT u.id, u.username, u.is_active, u.role_id, r.type AS role_type
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.username IS NOT NULL FOR UPDATE OF u`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Xodim topilmadi');
  return rows[0];
}

async function getById(actor, id, client = db) {
  const { rows } = await client.query(`${USER_SELECT} WHERE u.id = $1 AND u.username IS NOT NULL`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Xodim topilmadi');
  return toDto(rows[0], actor);
}

// --------------------------------------------------------------- amallar

async function list(actor, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const params = [];
  const conds = ['u.username IS NOT NULL'];

  const term = String(query.search || '').trim().slice(0, 100);
  if (term) {
    params.push(`%${term}%`);
    conds.push(`(u.full_name ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }
  if (query.roleType) {
    if (!ROLE_TYPES.includes(query.roleType)) throw new HttpError(400, 'Role turi noto\'g\'ri');
    params.push(query.roleType);
    conds.push(`r.type = $${params.length}`);
  }
  if (query.isActive === 'true' || query.isActive === 'false') {
    params.push(query.isActive === 'true');
    conds.push(`u.is_active = $${params.length}`);
  }
  const where = `WHERE ${conds.join(' AND ')}`;

  const total = (await db.query(
    `SELECT COUNT(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id ${where}`, params
  )).rows[0].n;
  params.push(limit, (page - 1) * limit);
  const { rows } = await db.query(
    `${USER_SELECT} ${where} ORDER BY u.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { data: rows.map((r) => toDto(r, actor)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** POST /api/users { username, fullName, roleId, password? } -> { user, temporaryPassword? } */
async function create(actor, body) {
  const data = readBody(body, { partial: false });
  const temp = temporaryPassword(body && body.password, data.username);
  const passwordHash = await hashPassword(temp.password);

  return db.withTransaction(async (client) => {
    const role = await getRole(client, data.roleId);
    assertCanManage(actor, role.type);
    const { rows } = await client.query(
      `INSERT INTO users (full_name, username, password_hash, must_change_password, role_id, is_active, created_by)
       VALUES ($1, $2, $3, TRUE, $4, TRUE, $5) RETURNING id`,
      [data.fullName, data.username, passwordHash, role.id, actor.id]
    );
    const user = await getById(actor, rows[0].id, client);
    return temp.generated ? { user, temporaryPassword: temp.password } : { user };
  });
}

async function update(actor, id, body) {
  const data = readBody(body, { partial: true });

  return db.withTransaction(async (client) => {
    const target = await lockTarget(client, id);
    assertCanManage(actor, target.role_type);

    if (data.roleId !== undefined && data.roleId !== target.role_id) {
      if (target.id === actor.id) {
        throw new HttpError(403, 'O\'z role\'ingizni o\'zgartira olmaysiz', undefined, 'SELF_ROLE_CHANGE');
      }
      const role = await getRole(client, data.roleId);
      assertCanManage(actor, role.type);
      if (target.role_type === 'ADMIN' && role.type !== 'ADMIN' && target.is_active) {
        await assertAnotherActiveAdmin(client, { excludeUserId: target.id });
      }
    }

    const sets = [];
    const params = [];
    const col = { fullName: 'full_name', username: 'username', roleId: 'role_id' };
    Object.entries(data).forEach(([k, v]) => {
      params.push(v);
      sets.push(`${col[k]} = $${params.length}`);
    });
    if (sets.length) {
      params.push(id);
      await client.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params);
    }
    return getById(actor, id, client);
  });
}

async function setStatus(actor, id, body) {
  if (!body || typeof body.isActive !== 'boolean') {
    throw new HttpError(400, 'isActive true yoki false bo\'lsin', { isActive: 'Majburiy' });
  }
  const { isActive } = body;
  if (id === actor.id) throw new HttpError(403, 'O\'zingizni bloklay olmaysiz', undefined, 'SELF_STATUS_CHANGE');

  return db.withTransaction(async (client) => {
    const target = await lockTarget(client, id);
    assertCanManage(actor, target.role_type);
    if (!isActive && target.role_type === 'ADMIN' && target.is_active) {
      await assertAnotherActiveAdmin(client, { excludeUserId: target.id });
    }
    // Faollashtirishda qulf ham olinadi; bloklashda barcha sessiyalar yopiladi
    await client.query(
      `UPDATE users SET is_active = $1, updated_at = NOW(),
         failed_attempts = CASE WHEN $1 THEN 0 ELSE failed_attempts END,
         locked_until    = CASE WHEN $1 THEN NULL ELSE locked_until END
       WHERE id = $2`,
      [isActive, id]
    );
    if (!isActive) await revokeAllSessions(id, client);
    return getById(actor, id, client);
  });
}

/**
 * POST /api/users/:id/reset-password { password? } -> { user, temporaryPassword }
 * O'z parolini bu yo'l bilan tiklab bo'lmaydi — buning uchun /auth/change-password.
 */
async function resetPassword(actor, id, body) {
  if (id === actor.id) {
    throw new HttpError(403, 'O\'z parolingizni "Parolni o\'zgartirish" sahifasida almashtiring', undefined, 'SELF_PASSWORD_RESET');
  }

  return db.withTransaction(async (client) => {
    const target = await lockTarget(client, id);
    assertCanManage(actor, target.role_type);
    const temp = temporaryPassword(body && body.password, target.username);
    await client.query(
      `UPDATE users SET password_hash = $1, must_change_password = TRUE, token_version = token_version + 1,
         failed_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $2`,
      [await hashPassword(temp.password), id]
    );
    await revokeAllSessions(id, client);
    return { user: await getById(actor, id, client), temporaryPassword: temp.password };
  });
}

module.exports = { list, create, update, setStatus, resetPassword, getById };
