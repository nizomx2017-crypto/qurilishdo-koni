/**
 * KATALOG — hamma uchun ochiq ko'rinish (login shart emas)
 *  - faqat faol (active) kategoriyalar va faol kategoriyadagi faol mahsulotlar ko'rinadi
 *  - qidiruv, kategoriya filtri, tartiblash va sahifalash umumiy crud.service orqali
 *  - javobda faqat mijozga kerakli maydonlar (PUBLIC_FIELDS): ichki holat, sanalar chiqmaydi
 */
const db = require('../../config/db');
const crud = require('../../services/crud.service');

const ACTIVE_CATEGORY = `EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.status = 'active')`;
const PUBLIC_SORT = ['id', 'name', 'price'];
const PUBLIC_FIELDS = [
  'id', 'name', 'category_id', 'category_id__label', 'sku', 'unit', 'price', 'stock_quantity', 'image_url', 'description',
];

const toPublic = (row) => Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, row[k] ?? null]));

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

async function listProducts(query) {
  // Ommaviy so'rovda status filtrini foydalanuvchi o'zgartira olmasin
  const { status, ...rest } = query; // eslint-disable-line no-unused-vars
  const sort = PUBLIC_SORT.includes(rest.sort) ? rest.sort : 'id';
  const res = await crud.list('products', { limit: 12, ...rest, sort }, {
    scope: { status: 'active' },
    extraWhere: ACTIVE_CATEGORY,
  });
  return { ...res, data: res.data.map(toPublic) };
}

async function getProduct(id) {
  return toPublic(await crud.getById('products', id, db, { scope: { status: 'active' }, extraWhere: ACTIVE_CATEGORY }));
}

module.exports = { listCategories, listProducts, getProduct };
