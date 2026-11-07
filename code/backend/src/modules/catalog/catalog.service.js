/**
 * KATALOG — hamma uchun ochiq ko'rinish (login shart emas)
 *  - faqat faol (active) kategoriyalar va faol kategoriyadagi faol mahsulotlar ko'rinadi
 *  - qidiruv, kategoriya filtri, tartiblash va sahifalash umumiy crud.service orqali
 */
const db = require('../../config/db');
const crud = require('../../services/crud.service');

const ACTIVE_CATEGORY = `EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.status = 'active')`;
const PUBLIC_SORT = ['id', 'name', 'price'];

async function listCategories() {
  const { rows } = await db.query(
    `SELECT c.id, c.name, c.description,
            COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
     WHERE c.status = 'active'
     GROUP BY c.id
     ORDER BY c.name`
  );
  return rows;
}

function listProducts(query) {
  // Ommaviy so'rovda status filtrini foydalanuvchi o'zgartira olmasin
  const { status, ...rest } = query; // eslint-disable-line no-unused-vars
  const sort = PUBLIC_SORT.includes(rest.sort) ? rest.sort : 'id';
  return crud.list('products', { limit: 12, ...rest, sort }, {
    scope: { status: 'active' },
    extraWhere: ACTIVE_CATEGORY,
  });
}

function getProduct(id) {
  return crud.getById('products', id, db, { scope: { status: 'active' }, extraWhere: ACTIVE_CATEGORY });
}

module.exports = { listCategories, listProducts, getProduct };
