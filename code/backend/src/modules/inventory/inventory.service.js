/**
 * INVENTORY (ombor harakatlari) — biznes mantiq
 *  - "in"  (kirim)  => mahsulot qoldig'i oshadi
 *  - "out" (chiqim) => mahsulot qoldig'i kamayadi, qoldiq manfiy bo'lishiga yo'l qo'yilmaydi
 *  - harakat tahrirlansa: eski ta'sir bekor qilinadi, yangisi qo'llanadi
 *  - harakat o'chirilsa: uning ta'siri bekor qilinadi
 * Hammasi bitta tranzaksiyada bajariladi (crud.service.js).
 */
const HttpError = require('../../utils/httpError');

const effect = (m) => (m.type === 'in' ? 1 : -1) * Number(m.quantity);

async function changeStock(client, productId, delta) {
  const res = await client.query(
    `UPDATE products SET stock_quantity = stock_quantity + $1
     WHERE id = $2 RETURNING name, stock_quantity`,
    [delta, productId]
  );
  const p = res.rows[0];
  if (p && Number(p.stock_quantity) < 0) {
    throw new HttpError(400, `Omborda yetarli emas: "${p.name}" qoldig'i ${Number(p.stock_quantity) - delta}`);
  }
}

module.exports = {
  afterCreate: (row, client) => changeStock(client, row.product_id, effect(row)),

  afterUpdate: async (row, old, client) => {
    await changeStock(client, old.product_id, -effect(old));
    await changeStock(client, row.product_id, effect(row));
  },

  afterDelete: (old, client) => changeStock(client, old.product_id, -effect(old)),
};
