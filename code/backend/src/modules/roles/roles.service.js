/**
 * ROLES — rollar va ularning access'lari (faqat ADMIN va DIRECTOR).
 *  - ADMIN va DIRECTOR turidagi rollar — to'liq huquq, matritsa ularga qo'llanmaydi;
 *  - MANAGER rollarining access'lari PUT /api/roles/:id/accesses bilan bitta tranzaksiyada almashtiriladi;
 *  - DIRECTOR faqat MANAGER rollarini yaratadi/o'zgartiradi/o'chiradi;
 *  - o'z role'ini o'chirib yoki turini o'zgartirib bo'lmaydi; oxirgi faol ADMIN role'i ADMIN'likdan chiqmaydi.
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const { assertCanManage, assertAnotherActiveAdmin, canManageType } = require('../users/hierarchy');

const ROLE_TYPES = ['ADMIN', 'DIRECTOR', 'MANAGER'];
const MAX_ACCESS_IDS = 500;

function readBody(body, { partial }) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  const errors = {};
  if (b.name !== undefined || !partial) {
    const v = typeof b.name === 'string' ? b.name.trim() : '';
    if (v.length < 2 || v.length > 50) errors.name = 'Nomi 2–50 belgi bo\'lsin';
    else out.name = v;
  }
  if (b.type !== undefined || !partial) {
    if (!ROLE_TYPES.includes(b.type)) errors.type = `Turi: ${ROLE_TYPES.join(', ')}`;
    else out.type = b.type;
  }
  if (b.description !== undefined) {
    if (b.description !== null && typeof b.description !== 'string') errors.description = 'Matn bo\'lsin';
    else if (b.description && b.description.length > 500) errors.description = '500 belgidan oshmasin';
    else out.description = b.description ? b.description.trim() : null;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Ma\'lumotlar noto\'g\'ri to\'ldirilgan', errors);
  return out;
}

async function accessIdsByRole(client, roleIds) {
  if (!roleIds.length) return {};
  const { rows } = await client.query(
    `SELECT role_id, array_agg(access_id ORDER BY access_id) AS ids
     FROM role_accesses WHERE role_id = ANY($1::int[]) GROUP BY role_id`,
    [roleIds]
  );
  return Object.fromEntries(rows.map((r) => [r.role_id, r.ids]));
}

function toDto(row, accessIds, actor) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    usersCount: row.users_count,
    fullAccess: row.type !== 'MANAGER',
    accessIds: row.type === 'MANAGER' ? accessIds || [] : [],
    manageable: canManageType(actor, row.type),
    isOwn: Boolean(actor) && actor.roleId === row.id,
    createdAt: row.created_at,
  };
}

const ROLE_SELECT = `
  SELECT r.id, r.name, r.type, r.description, r.created_at,
         (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id AND u.login IS NOT NULL) AS users_count
  FROM roles r`;

async function getById(actor, id, client = db) {
  const { rows } = await client.query(`${ROLE_SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Role topilmadi');
  const ids = await accessIdsByRole(client, [id]);
  return toDto(rows[0], ids[id], actor);
}

async function list(actor) {
  const { rows } = await db.query(
    `${ROLE_SELECT} ORDER BY CASE r.type WHEN 'ADMIN' THEN 1 WHEN 'DIRECTOR' THEN 2 ELSE 3 END, r.name`
  );
  const ids = await accessIdsByRole(db, rows.map((r) => r.id));
  return rows.map((r) => toDto(r, ids[r.id], actor));
}

async function lockRole(client, id) {
  const { rows } = await client.query('SELECT id, name, type FROM roles WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw new HttpError(404, 'Role topilmadi');
  return rows[0];
}

async function create(actor, body) {
  const data = readBody(body, { partial: false });
  assertCanManage(actor, data.type);
  const { rows } = await db.query(
    'INSERT INTO roles (name, type, description) VALUES ($1, $2, $3) RETURNING id',
    [data.name, data.type, data.description ?? null]
  );
  return getById(actor, rows[0].id);
}

async function update(actor, id, body) {
  const data = readBody(body, { partial: true });
  return db.withTransaction(async (client) => {
    const role = await lockRole(client, id);
    assertCanManage(actor, role.type);
    if (data.type !== undefined && data.type !== role.type) {
      if (actor.roleId === role.id) {
        throw new HttpError(403, 'O\'z role\'ingiz turini o\'zgartira olmaysiz', undefined, 'SELF_ROLE_CHANGE');
      }
      assertCanManage(actor, data.type);
      if (role.type === 'ADMIN') await assertAnotherActiveAdmin(client, { excludeRoleId: role.id });
    }
    const col = { name: 'name', type: 'type', description: 'description' };
    const sets = [];
    const params = [];
    Object.entries(data).forEach(([k, v]) => {
      params.push(v);
      sets.push(`${col[k]} = $${params.length}`);
    });
    if (sets.length) {
      params.push(id);
      await client.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }
    return getById(actor, id, client);
  });
}

async function remove(actor, id) {
  return db.withTransaction(async (client) => {
    const role = await lockRole(client, id);
    assertCanManage(actor, role.type);
    if (actor.roleId === role.id) throw new HttpError(403, 'O\'z role\'ingizni o\'chira olmaysiz', undefined, 'SELF_ROLE_CHANGE');
    const used = await client.query('SELECT 1 FROM users WHERE role_id = $1 LIMIT 1', [id]);
    if (used.rowCount) throw new HttpError(409, 'Bu role\'da xodimlar bor. Avval ularni boshqa role\'ga o\'tkazing', undefined, 'ROLE_IN_USE');
    await client.query('DELETE FROM roles WHERE id = $1', [id]);
    return { deleted: true, id };
  });
}

async function setAccesses(actor, id, body) {
  const raw = body && body.accessIds;
  if (!Array.isArray(raw) || raw.length > MAX_ACCESS_IDS
      || !raw.every((v) => Number.isInteger(v) && v > 0 && v <= 2147483647)) {
    throw new HttpError(400, 'accessIds — musbat butun sonlar massivi bo\'lsin', { accessIds: 'Noto\'g\'ri' });
  }
  const accessIds = [...new Set(raw)];

  return db.withTransaction(async (client) => {
    const role = await lockRole(client, id);
    assertCanManage(actor, role.type);
    if (role.type !== 'MANAGER') {
      throw new HttpError(400, 'ADMIN va DIRECTOR rollari to\'liq huquqqa ega — ularga access belgilanmaydi', undefined, 'FULL_ACCESS_ROLE');
    }
    if (accessIds.length) {
      const found = await client.query('SELECT COUNT(*)::int AS n FROM accesses WHERE id = ANY($1::int[])', [accessIds]);
      if (found.rows[0].n !== accessIds.length) throw new HttpError(400, 'Ba\'zi access\'lar topilmadi', { accessIds: 'Noto\'g\'ri' });
    }
    await client.query('DELETE FROM role_accesses WHERE role_id = $1', [id]);
    if (accessIds.length) {
      await client.query(
        'INSERT INTO role_accesses (role_id, access_id) SELECT $1, unnest($2::int[])',
        [id, accessIds]
      );
    }
    return getById(actor, id, client);
  });
}

module.exports = { list, getById, create, update, remove, setAccesses };
