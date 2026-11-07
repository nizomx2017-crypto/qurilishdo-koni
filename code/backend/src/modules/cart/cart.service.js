/**
 * SAVATCHA — har bir foydalanuvchining o'z savatchasi (cart_items)
 *  - bir mahsulot savatchada bitta qatorda turadi, qayta qo'shilsa miqdori oshadi
 *  - miqdor qoldiqdan oshmasligi tekshiriladi (yakuniy tekshiruv buyurtma tranzaksiyasida)
 */
const db = require('../../config/db');
const validate = require('../../api/validators/validate');
const HttpError = require('../../utils/httpError');

const MAX_QTY = 10000;

const addSchema = {
  columns: {
    product_id: { label: 'Mahsulot', type: 'ref', required: true },
    quantity:   { label: 'Miqdor', type: 'number', integer: true, min: 1, max: MAX_QTY, default: 1 },
  },
};
const qtySchema = {
  columns: {
    quantity: { label: 'Miqdor', type: 'number', required: true, integer: true, min: 1, max: MAX_QTY },
  },
};

async function getCart(userId) {
  const { rows } = await db.query(
    `SELECT ci.id, ci.product_id, ci.quantity,
            p.name, p.unit, p.price, p.stock_quantity, p.image_url,
            (p.status = 'active' AND c.status = 'active') AS available,
            (ci.quantity * p.price) AS total_price
     FROM cart_items ci
     JOIN products p   ON p.id = ci.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE ci.user_id = $1
     ORDER BY ci.id`,
    [userId]
  );
  const total = rows.reduce((sum, r) => sum + Number(r.total_price), 0);
  const count = rows.reduce((sum, r) => sum + r.quantity, 0);
  return { items: rows, total, count };
}

async function findSellableProduct(productId) {
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.stock_quantity
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1 AND p.status = 'active' AND c.status = 'active'`,
    [productId]
  );
  if (!rows[0]) throw new HttpError(404, 'Mahsulot topilmadi yoki sotuvda emas');
  return rows[0];
}

function ensureStock(product, quantity) {
  if (quantity > product.stock_quantity) {
    throw new HttpError(400, `"${product.name}" omborda yetarli emas: mavjud ${product.stock_quantity}`);
  }
}

async function addItem(userId, body) {
  const data = validate(addSchema, body, 'create');
  const product = await findSellableProduct(data.product_id);

  const current = await db.query(
    'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, product.id]
  );
  const newQty = (current.rows[0] ? current.rows[0].quantity : 0) + data.quantity;
  ensureStock(product, newQty);

  await db.query(
    `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [userId, product.id, newQty]
  );
  return getCart(userId);
}

async function updateItem(userId, itemId, body) {
  const data = validate(qtySchema, body, 'create');
  const { rows } = await db.query('SELECT product_id FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
  if (!rows[0]) throw new HttpError(404, 'Savatchada bunday qator yo\'q');

  ensureStock(await findSellableProduct(rows[0].product_id), data.quantity);
  await db.query('UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3', [data.quantity, itemId, userId]);
  return getCart(userId);
}

async function removeItem(userId, itemId) {
  const res = await db.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [itemId, userId]);
  if (!res.rowCount) throw new HttpError(404, 'Savatchada bunday qator yo\'q');
  return getCart(userId);
}

async function clear(userId) {
  await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  return getCart(userId);
}

module.exports = { getCart, addItem, updateItem, removeItem, clear };
