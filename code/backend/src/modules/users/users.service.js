/**
 * USERS — xodimlarni boshqarish (faqat ADMIN va DIRECTOR; ierarxiya hierarchy.js da).
 *  - xodim o'zi ro'yxatdan o'tmaydi, uni admin/direktor yaratadi;
 *  - kirish kodi generatsiya qilinadi va javobda faqat BIR MARTA qaytadi (yaratilganda / yangilanganda);
 *  - kod yangilansa eski kod ishlamaydi va xodimning barcha sessiyalari bekor qilinadi;
 *  - hech kim o'zini bloklay olmaydi va o'z role'ini o'zgartira olmaydi.
 * code_hash hech qachon javobga chiqmaydi.
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const { generateCode, hashCode } = require('../../utils/code');
const { revokeAllSessions } = require('../auth/auth.service');
const { assertCanManage, assertAnotherActiveAdmin, canManageType } = require('./hierarchy');

const LOGIN_RE = /^[a-zA-Z0-9._-]{3,50}$/;
const ROLE_TYPES = ['ADMIN', 'DIRECTOR', 'MANAGER'];

const USER_SELECT = `
  SELECT u.id, u.full_name, u.login, u.is_active, u.failed_attempts, u.locked_until,
         u.created_at, u.updated_at, u.code_hash IS NOT NULL AS has_code,
         r.id AS role_id, r.name AS role_name, r.type AS role_type,
         c.full_name AS created_by_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN users c ON c.id = u.created_by`;

function toDto(row, actor) {
  return {
    id: row.id,
    fullName: row.full_name,
    login: row.login,
    isActive: row.is_active,
    lockedUntil: row.locked_until && new Date(row.locked_until) > new Date() ? row.locked_until : null,
    failedAttempts: row.failed_attempts,
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
  if (b.login !== undefined || !partial) {
    const v = typeof b.login === 'string' ? b.login.trim() : '';
    if (!LOGIN_RE.test(v)) errors.login = 'Login 3–50 belgi: lotin harflari, raqam, . _ -';
    else out.login = v;
  }
  if (b.roleId !== undefined || !partial) {
    const v = Number(b.roleId);
    if (!Number.isInteger(v) || v <= 0 || v > 2147483647) errors.roleId = 'Role tanlang';
    else out.roleId = v;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Ma\'lumotlar noto\'g\'ri to\'ldirilgan', errors);
  return out;
}

async function getRole(client, id) {
  const { rows } = await client.query('SELECT id, name, type FROM roles WHERE id = $1', [id]);
  if (!rows[0]) throw new HttpError(400, 'Role topilmadi', { roleId: 'Role topilmadi' });
  return rows[0];
}

async function lockTarget(client, id) {
  const { rows } = await client.query(
    `SELECT u.id, u.login, u.is_active, u.role_id, r.type AS role_type
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.login IS NOT NULL FOR UPDATE OF u`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Xodim topilmadi');
  return rows[0];
}

async function getById(actor, id, client = db) {
  const { rows } = await client.query(`${USER_SELECT} WHERE u.id = $1 AND u.login IS NOT NULL`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Xodim topilmadi');
  return toDto(rows[0], actor);
}

// --------------------------------------------------------------- amallar

async function list(actor, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const params = [];
  const conds = ['u.login IS NOT NULL'];

  const term = String(query.search || '').trim().slice(0, 100);
  if (term) {
    params.push(`%${term}%`);
    conds.push(`(u.full_name ILIKE $${params.length} OR u.login ILIKE $${params.length})`);
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

async function create(actor, body) {
  const data = readBody(body, { partial: false });
  const code = generateCode();
  const codeHash = await hashCode(code);

  return db.withTransaction(async (client) => {
    const role = await getRole(client, data.roleId);
    assertCanManage(actor, role.type);
    const { rows } = await client.query(
      `INSERT INTO users (full_name, login, code_hash, role_id, is_active, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING id`,
      [data.fullName, data.login, codeHash, role.id, actor.id]
    );
    return { user: await getById(actor, rows[0].id, client), code };
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
    const col = { fullName: 'full_name', login: 'login', roleId: 'role_id' };
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

async function regenerateCode(actor, id) {
  const code = generateCode();
  const codeHash = await hashCode(code);

  return db.withTransaction(async (client) => {
    const target = await lockTarget(client, id);
    if (target.id !== actor.id) assertCanManage(actor, target.role_type);
    await client.query(
      `UPDATE users SET code_hash = $1, failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2`,
      [codeHash, id]
    );
    await revokeAllSessions(id, client);
    return { user: await getById(actor, id, client), code };
  });
}

module.exports = { list, create, update, setStatus, regenerateCode, getById };
