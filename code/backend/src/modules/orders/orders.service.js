/**
 * BUYURTMALAR
 *  checkout     — mijoz (akkauntsiz) buyurtmasi, tranzaksiyada (pastda batafsil).
 *  listAll      — panel: barcha buyurtmalar.
 *  updateStatus — panel: holatni o'zgartirish. Bekor qilinsa, qoldiq qaytariladi.
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
    customer_name: { label: 'Ism', type: 'text', required: true, minLength: 2, maxLength: 150 },
    phone:         { label: 'Telefon', type: 'text', required: true, minLength: 7, maxLength: 30 },
    address:       { label: 'Manzil', type: 'text', required: true, minLength: 5, maxLength: 500 },
    note:          { label: 'Izoh', type: 'text', maxLength: 1000 },
  },
};
const PHONE_RE = /^\+?[\d\s()-]{7,30}$/;
const MAX_LINES = 50;
const MAX_QTY = 10000;
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

/** items: [{ product_id, quantity }] -> bir xil mahsulotlar qo'shiladi, tekshiriladi */
function readItems(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new HttpError(400, "Savatcha bo'sh", { items: 'Kamida bitta mahsulot tanlang' });
  if (raw.length > MAX_LINES) throw new HttpError(400, `Bir buyurtmada ${MAX_LINES} tadan ko'p mahsulot bo'lmasin`);
  const map = new Map();
  for (const it of raw) {
    const id = Number(it && it.product_id);
    const qty = Number(it && it.quantity);
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new HttpError(400, "Savatchadagi mahsulot yoki miqdor noto'g'ri", { items: "Noto'g'ri" });
    }
    map.set(id, (map.get(id) || 0) + qty);
  }
  for (const qty of map.values()) {
    if (qty > MAX_QTY) throw new HttpError(400, 'Miqdor juda katta', { items: "Noto'g'ri" });
  }
  return map;
}

/** Ochiq buyurtma formasi uchun maydonlarni tekshiradi (captcha'dan OLDIN — xato bo'lsa captcha yonib ketmasin) */
function validateCheckout(body) {
  const data = validate(checkoutSchema, body, 'create');
  if (!PHONE_RE.test(data.phone) || (data.phone.match(/\d/g) || []).length < 7) {
    throw new HttpError(400, "Ma'lumotlar noto'g'ri to'ldirilgan", { phone: "Telefon raqami noto'g'ri" });
  }
  return { ...data, items: readItems(body && body.items) };
}

/**
 * Mijoz buyurtmasi (akkauntsiz). BITTA TRANZAKSIYADA:
 *  1) mahsulot qatorlari qulflanadi (FOR UPDATE) — ikki xaridor oxirgi donani birga ololmaydi;
 *  2) sotuvdaligi va qoldiq tekshiriladi; narx va nom BAZADAN olinadi (mijoz yuborgan narxga ishonilmaydi);
 *  3) orders + order_items yoziladi, qoldiq kamaytiriladi.
 * Javobda faqat mijozga kerakli maydonlar.
 */
async function checkout(data) {
  const ids = [...data.items.keys()].sort((a, b) => a - b);

  return db.withTransaction(async (client) => {
    const { rows: products } = await client.query(
      `SELECT p.id, p.name, p.unit, p.price, p.stock_quantity,
              (p.status = 'active' AND c.status = 'active') AS available
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.id = ANY($1::int[])
       ORDER BY p.id
       FOR UPDATE OF p`,
      [ids]
    );
    const byId = new Map(products.map((p) => [p.id, p]));

    const problems = {};
    for (const id of ids) {
      const p = byId.get(id);
      const qty = data.items.get(id);
      if (!p || !p.available) problems[id] = p ? `"${p.name}" hozir sotuvda emas` : 'Mahsulot topilmadi';
      else if (qty > p.stock_quantity) problems[id] = `"${p.name}" yetarli emas: mavjud ${p.stock_quantity}, so'ralgan ${qty}`;
    }
    if (Object.keys(problems).length) {
      throw new HttpError(409, "Ba'zi mahsulotlarni buyurtma qilib bo'lmaydi", problems, 'OUT_OF_STOCK');
    }

    // Tiyinlarda hisoblaymiz — kasr sonlar yig'indisida yaxlitlash xatosi chiqmasligi uchun
    const lines = ids.map((id) => {
      const p = byId.get(id);
      const quantity = data.items.get(id);
      return { ...p, quantity, line_total: Math.round(quantity * Number(p.price) * 100) / 100 };
    });
    const total = Math.round(lines.reduce((sum, l) => sum + l.line_total * 100, 0)) / 100;

    const { rows: [order] } = await client.query(
      `INSERT INTO orders (user_id, customer_name, total_amount, phone, address, note)
       VALUES (NULL, $1, $2, $3, $4, $5)
       RETURNING id, status, total_amount, created_at`,
      [data.customer_name, total, data.phone, data.address, data.note || null]
    );

    for (const l of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, l.id, l.name, l.unit, l.price, l.quantity, l.line_total]
      );
      await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [l.quantity, l.id]);
    }

    return {
      ...order,
      items: lines.map((l) => ({
        product_id: l.id, product_name: l.name, unit: l.unit,
        unit_price: Number(l.price), quantity: l.quantity, total_price: l.line_total,
      })),
    };
  });
}

/** Panel: barcha buyurtmalar, ?page=&limit=&status=&search= (id, mijoz ismi yoki telefon) */
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
    const or = [`o.customer_name ILIKE ${p}`, `o.phone ILIKE ${p}`];
    if (/^\d{1,9}$/.test(term)) {
      params.push(parseInt(term, 10));
      or.push(`o.id = $${params.length}`);
    }
    conds.push(`(${or.join(' OR ')})`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const from = 'FROM orders o';

  const total = (await db.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params)).rows[0].total;
  params.push(limit, (page - 1) * limit);
  const { rows } = await db.query(
    `SELECT o.id, o.customer_name,
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

module.exports = { validateCheckout, checkout, listAll, updateStatus, STATUSES };
