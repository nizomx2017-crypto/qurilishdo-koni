/**
 * UMUMIY CRUD SERVICE
 * ------------------------------------------------------------
 * Barcha jadvallar uchun bitta kod: ro'yxat (pagination + qidiruv), bitta yozuv,
 * qo'shish, tahrirlash, o'chirish.
 *
 * Har bir modulning o'ziga xos BIZNES MANTIG'I esa alohida faylda (hooks):
 *   src/modules/<modul>/<modul>.service.js
 * Masalan: ombor harakati qo'shilsa — mahsulot qoldig'i o'zgaradi.
 * Shu ajratish tufayli keyinchalik har bir modulni alohida microservice'ga
 * ko'chirish oson bo'ladi.
 */
const db = require('../config/db');
const validate = require('../api/validators/validate');
const HttpError = require('../utils/httpError');
const { getResource } = require('../modules/registry');
const hooks = require('../modules/hooks');

const q = (ident) => `"${ident}"`; // identifikatorni xavfsiz o'rash (nomlar faqat registry'dan olinadi)

/** Bazadan o'qiladigan ustunlar (virtual maydonlar, masalan parol, kirmaydi) */
function realColumns(resource) {
  return Object.entries(resource.columns)
    .filter(([, c]) => !c.virtual)
    .map(([name]) => name);
}

/** Bog'langan jadvalning ko'rinadigan nomi uchun SQL ifoda */
function displayExpr(alias, refResource) {
  return refResource.display === 'id'
    ? `'#' || ${alias}."id"`
    : `${alias}.${q(refResource.display)}`;
}

/** SELECT qismini quradi: asosiy ustunlar + bog'langan jadval nomlari (<ustun>__label) */
function buildSelect(resource) {
  const t = 't';
  const fields = [`${t}."id"`, ...realColumns(resource).map((c) => `${t}.${q(c)}`)];
  const joins = [];

  Object.entries(resource.columns).forEach(([name, col], i) => {
    if (col.type !== 'ref') return;
    const ref = getResource(col.ref);
    const alias = `r${i}`;
    joins.push(`LEFT JOIN ${q(ref.table)} ${alias} ON ${alias}."id" = ${t}.${q(name)}`);
    fields.push(`${displayExpr(alias, ref)} AS ${q(name + '__label')}`);
  });

  return { from: `${q(resource.table)} ${t} ${joins.join(' ')}`, fields: fields.join(', ') };
}

function mustGet(name) {
  const resource = getResource(name);
  if (!resource) throw new HttpError(404, `"${name}" degan bo'lim topilmadi`);
  return resource;
}

// ---------------------------------------------------------------- READ

async function list(name, { page = 1, limit = 10, search = '', sort = 'id', order = 'desc' } = {}) {
  const resource = mustGet(name);
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  // Tartiblash faqat mavjud ustunlar bo'yicha (aks holda id)
  const sortCol = sort === 'id' || realColumns(resource).includes(sort) ? sort : 'id';
  const sortDir = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const { from, fields } = buildSelect(resource);
  const params = [];
  let where = '';

  const searchCols = Object.entries(resource.columns).filter(([, c]) => c.searchable).map(([n]) => n);
  if (search && searchCols.length) {
    params.push(`%${search}%`);
    const conds = searchCols.map((c) => `t.${q(c)}::text ILIKE $1`);
    if (/^\d{1,9}$/.test(search)) conds.push(`t."id" = ${parseInt(search, 10)}`);
    where = `WHERE ${conds.join(' OR ')}`;
  }

  const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM ${from} ${where}`, params);
  const total = countRes.rows[0].total;

  params.push(limit, (page - 1) * limit);
  const dataRes = await db.query(
    `SELECT ${fields} FROM ${from} ${where}
     ORDER BY t.${q(sortCol)} ${sortDir}, t."id" ${sortDir}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { data: dataRes.rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function getById(name, id, client = db) {
  const resource = mustGet(name);
  const { from, fields } = buildSelect(resource);
  const res = await client.query(`SELECT ${fields} FROM ${from} WHERE t."id" = $1`, [id]);
  if (!res.rows[0]) throw new HttpError(404, 'Yozuv topilmadi');
  return res.rows[0];
}

/** Select (dropdown) uchun qisqa ro'yxat: [{ id, label }] */
async function options(name) {
  const resource = mustGet(name);
  const expr = displayExpr('t', resource);
  const res = await db.query(
    `SELECT t."id", ${expr} AS "label" FROM ${q(resource.table)} t ORDER BY t."id" DESC LIMIT 1000`
  );
  return res.rows;
}

// ---------------------------------------------------------------- WRITE

async function create(name, body) {
  const resource = mustGet(name);
  const hook = hooks[name] || {};
  let data = validate(resource, body, 'create');

  return db.withTransaction(async (client) => {
    if (hook.beforeCreate) data = await hook.beforeCreate(data, client);
    const cols = Object.keys(data);
    if (!cols.length) throw new HttpError(400, 'Bo\'sh ma\'lumot yuborildi');

    const res = await client.query(
      `INSERT INTO ${q(resource.table)} (${cols.map(q).join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING "id"`,
      cols.map((c) => data[c])
    );
    const row = await getById(name, res.rows[0].id, client);
    if (hook.afterCreate) await hook.afterCreate(row, client);
    return getById(name, row.id, client);
  });
}

async function update(name, id, body) {
  const resource = mustGet(name);
  const hook = hooks[name] || {};
  let data = validate(resource, body, 'update');

  return db.withTransaction(async (client) => {
    const old = await getById(name, id, client);
    if (hook.beforeUpdate) data = await hook.beforeUpdate(data, old, client);
    const cols = Object.keys(data);

    if (cols.length) {
      await client.query(
        `UPDATE ${q(resource.table)} SET ${cols.map((c, i) => `${q(c)} = $${i + 1}`).join(', ')}
         WHERE "id" = $${cols.length + 1}`,
        [...cols.map((c) => data[c]), id]
      );
    }
    const row = await getById(name, id, client);
    if (hook.afterUpdate) await hook.afterUpdate(row, old, client);
    return getById(name, id, client);
  });
}

async function remove(name, id) {
  const resource = mustGet(name);
  const hook = hooks[name] || {};

  return db.withTransaction(async (client) => {
    const old = await getById(name, id, client);
    if (hook.beforeDelete) await hook.beforeDelete(old, client);
    await client.query(`DELETE FROM ${q(resource.table)} WHERE "id" = $1`, [id]);
    if (hook.afterDelete) await hook.afterDelete(old, client);
    return { deleted: true, id: Number(id) };
  });
}

module.exports = { list, getById, options, create, update, remove };
