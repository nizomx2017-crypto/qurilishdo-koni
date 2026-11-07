/**
 * Admin marshrutlari (/api/admin) — hammasi authenticate + requireAdmin orqali o'tadi.
 *   GET   /api/admin/meta                  admin formalari uchun tavsif
 *   GET   /api/admin/orders                barcha buyurtmalar ?page=&limit=&status=&search=
 *   PATCH /api/admin/orders/:id/status     { status }  holatni o'zgartirish
 *   /api/admin/categories, /api/admin/products — umumiy CRUD (crud.routes.js)
 */
const express = require('express');
const orders = require('../../modules/orders/orders.service');
const { authenticate, requireAdmin } = require('../middleware/auth');
const metaRoutes = require('./meta.routes');
const crudRoutes = require('./crud.routes');
const { wrap, idOf } = require('./helpers');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.use('/meta', metaRoutes);

router.get('/orders', wrap(async (req, res) => {
  res.json(await orders.listAll(req.query));
}));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  res.json(await orders.updateStatus(idOf(req), req.body));
}));

router.use('/', crudRoutes);

module.exports = router;
