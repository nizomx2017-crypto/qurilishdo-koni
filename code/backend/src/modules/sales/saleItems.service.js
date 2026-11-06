/**
 * SALE ITEMS (sotuv qatorlari) — biznes mantiq
 *  - qator summasi avtomatik: total_price = quantity * unit_price
 *  - narx kiritilmasa, mahsulotning sotish narxi olinadi
 *  - har o'zgarishdan keyin sotuvning jami summasi (sales.total_amount) qayta hisoblanadi
 */
async function recalcSale(client, saleId) {
  await client.query(
    `UPDATE sales SET total_amount =
       COALESCE((SELECT SUM(total_price) FROM sale_items WHERE sale_id = $1), 0)
     WHERE id = $1`,
    [saleId]
  );
}

async function fillTotals(data, old, client) {
  const merged = { ...(old || {}), ...data };
  if ((merged.unit_price === undefined || merged.unit_price === null) && merged.product_id) {
    const p = await client.query('SELECT sale_price FROM products WHERE id = $1', [merged.product_id]);
    if (p.rows[0]) data.unit_price = merged.unit_price = Number(p.rows[0].sale_price);
  }
  data.total_price = Number(merged.quantity) * Number(merged.unit_price);
  return data;
}

module.exports = {
  beforeCreate: (data, client) => fillTotals(data, null, client),
  beforeUpdate: (data, old, client) => fillTotals(data, old, client),
  afterCreate: (row, client) => recalcSale(client, row.sale_id),
  afterUpdate: async (row, old, client) => {
    await recalcSale(client, row.sale_id);
    if (old.sale_id !== row.sale_id) await recalcSale(client, old.sale_id);
  },
  afterDelete: (old, client) => recalcSale(client, old.sale_id),
};
