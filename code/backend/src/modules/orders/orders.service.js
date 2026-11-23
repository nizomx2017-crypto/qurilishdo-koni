/**
 * BUYURTMALAR
 *  checkout — savatchadan buyurtma yaratish. BITTA TRANZAKSIYADA:
 *     1) savatchadagi mahsulotlar qatorlari qulflanadi (SELECT ... FOR UPDATE),
 *        shunda ikki xaridor bir vaqtda oxirgi donani sotib ololmaydi;
 *     2) har bir mahsulot sotuvda ekani va qoldiq yetarliligi tekshiriladi;
 *     3) orders + order_items yoziladi (nom va narx shu paytdagi holatda saqlanadi);
 *     4) mahsulot qoldig'i kamaytiriladi;
 *     5) savatcha tozalanadi.
 *     Birorta qadam xato bersa — hammasi bekor qilinadi (ROLLBACK).
 *  updateStatus — admin buyurtma holatini o'zgartiradi. Bekor qilinsa, qoldiq qaytariladi.
 */
const db = require('../../config/db');
const validate = require('../../api/validators/validate');
const HttpError = require('../../utils/httpError');

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
// Qaysi holatdan qaysi holatga o'tish mumkin
const TRANSITIONS = {
  new:       ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const checkoutSchema = {
  columns: {
    phone:   { label: 'Telefon', type: 'text', required: true, minLength: 7, maxLength: 30 },
    address: { label: 'Manzil', type: 'text', required: true, minLength: 5, maxLength: 500 },
    note:    { label: 'Izoh', type: 'text', maxLength: 1000 },
  },
};
const statusSchema = {
  columns: { status: { label: 'Holat', type: 'select', options: STATUSES, required: true } },
};

async function loadItems(client, orderIds) {
  if (!orderIds.length) return {};
  const { rows } = await client.query(
    `SELECT id, order_id, product_id, product_name, unit, unit_price, quantity, total_price
     FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id`,
    [orderIds]
  );
  return rows.reduce((acc, r) => {
    (acc[r.order_id] = acc[r.order_id] || []).push(r);
    return acc;
  }, {});
}

async function withItems(client, orders) {
  const items = await loadItems(client, orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items[o.id] || [] }));
}

async function checkout(userId, body) {
  const data = validate(checkoutSchema, body, 'create');

  return db.withTransaction(async (client) => {
    const { rows: cart } = await client.query(
      `SELECT ci.quantity, p.id AS product_id, p.name, p.unit, p.price, p.stock_quantity,
              (p.status = 'active' AND c.status = 'active') AS available
       FROM cart_items ci
       JOIN products p   ON p.id = ci.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE ci.user_id = $1
       ORDER BY p.id
       FOR UPDATE OF ci, p`,
      [userId]
    );
    if (!cart.length) throw new HttpError(400, 'Savatcha bo\'sh');

    const problems = {};
    for (const it of cart) {
      if (!it.available) problems[it.product_id] = `"${it.name}" hozir sotuvda emas`;
      else if (it.quantity > it.stock_quantity) {
        problems[it.product_id] = `"${it.name}" yetarli emas: mavjud ${it.stock_quantity}, so'ralgan ${it.quantity}`;
      }
    }
    if (Object.keys(problems).length) {
      throw new HttpError(409, 'Ba\'zi mahsulotlarni buyurtma qilib bo\'lmaydi', problems);
    }

    // Tiyinlarda hisoblaymiz — kasr sonlar yig'indisida yaxlitlash xatosi chiqmasligi uchun
    cart.forEach((it) => { it.line_total = Math.round(it.quantity * Number(it.price) * 100) / 100; });
    const total = Math.round(cart.reduce((sum, it) => sum + it.line_total * 100, 0)) / 100;
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (user_id, total_amount, phone, address, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, total, data.phone, data.address, data.note || null]
    );

    for (const it of cart) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, it.product_id, it.name, it.unit, it.price, it.quantity, it.line_total]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [it.quantity, it.product_id]
      );
    }

    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    const [full] = await withItems(client, [order]);
    return full;
  });
}

async function listMine(userId) {
  const { rows } = await db.query(
    `SELECT id, total_amount, status, phone, address, note, created_at, updated_at
     FROM orders WHERE user_id = $1 ORDER BY id DESC`,
    [userId]
  );
  return withItems(db, rows);
}

/** Admin: barcha buyurtmalar, ?page=&limit=&status=&search= (id, mijoz ismi, email yoki telefon) */
async function listAll(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const params = [];
  const conds = [];

  if (query.status) {
    if (!STATUSES.includes(query.status)) throw new HttpError(400, 'Holat filtri noto\'g\'ri');
    params.push(query.status);
    conds.push(`o.status = $${params.length}`);
  }
  const term = String(query.search || '').trim().slice(0, 100);
  if (term) {
    params.push(`%${term}%`);
    const p = `$${params.length}`;
    const or = [`u.full_name ILIKE ${p}`, `u.email ILIKE ${p}`, `o.phone ILIKE ${p}`];
    if (/^\d{1,9}$/.test(term)) {
      params.push(parseInt(term, 10));
      or.push(`o.id = $${params.length}`);
    }
    conds.push(`(${or.join(' OR ')})`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const from = 'FROM orders o JOIN users u ON u.id = o.user_id';

  const total = (await db.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params)).rows[0].total;
  params.push(limit, (page - 1) * limit);
  const { rows } = await db.query(
    `SELECT o.id, o.user_id, u.full_name AS user_name, u.email AS user_email,
            o.total_amount, o.status, o.phone, o.address, o.note, o.created_at, o.updated_at
     ${from} ${where}
     ORDER BY o.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: await withItems(db, rows),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function updateStatus(orderId, body) {
  const { status } = validate(statusSchema, body, 'create');

  return db.withTransaction(async (client) => {
    const { rows: [order] } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (!order) throw new HttpError(404, 'Buyurtma topilmadi');
    if (order.status === status) return (await withItems(client, [order]))[0];
    if (!TRANSITIONS[order.status].includes(status)) {
      throw new HttpError(400, `Buyurtmani "${order.status}" holatidan "${status}" holatiga o'tkazib bo'lmaydi`);
    }

    if (status === 'cancelled') {
      // Bekor qilingan buyurtmadagi mahsulotlar qoldig'i qaytariladi
      await client.query(
        `UPDATE products p SET stock_quantity = p.stock_quantity + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [orderId]
      );
    }

    const { rows: [updated] } = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );
    return (await withItems(client, [updated]))[0];
  });
}

module.exports = { checkout, listMine, listAll, updateStatus, STATUSES };
