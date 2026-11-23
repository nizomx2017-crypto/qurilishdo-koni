// ACCESSES — sahifalar bo'yicha guruhlangan amallar ro'yxati (rollar matritsasi uchun)
const db = require('../../config/db');

const ACTIONS = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'APPROVE'];

async function listGrouped() {
  const { rows } = await db.query(
    `SELECT p.id AS page_id, p.code AS page_code, p.name AS page_name, p.sort_order,
            a.id, a.action, a.code
     FROM pages p LEFT JOIN accesses a ON a.page_id = p.id
     ORDER BY p.sort_order, p.id, a.id`
  );
  const pages = new Map();
  rows.forEach((r) => {
    if (!pages.has(r.page_id)) {
      pages.set(r.page_id, { id: r.page_id, code: r.page_code, name: r.page_name, accesses: [] });
    }
    if (r.id) pages.get(r.page_id).accesses.push({ id: r.id, action: r.action, code: r.code });
  });
  return { actions: ACTIONS, pages: [...pages.values()] };
}

module.exports = { listGrouped, ACTIONS };
