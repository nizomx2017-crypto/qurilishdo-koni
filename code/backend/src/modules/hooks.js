/**
 * Modullarning biznes mantiqlari (hooks) shu yerda yig'iladi.
 * Hook bo'lmagan modullar (masalan categories, suppliers) oddiy CRUD bilan ishlaydi.
 */
module.exports = {
  users: require('./users/users.service'),
  inventory_movements: require('./inventory/inventory.service'),
  sale_items: require('./sales/saleItems.service'),
};
