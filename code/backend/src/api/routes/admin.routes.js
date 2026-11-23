/**
 * Panel marshrutlari (/api/admin) — hammasi authenticate dan o'tadi, har biri o'z access'ini talab qiladi.
 *   GET   /api/admin/meta                  formalar tavsifi (login yetarli)
 *   GET   /api/admin/orders                ORDER_VIEW      ?page=&limit=&status=&search=
 *   PATCH /api/admin/orders/:id/status     { status }  confirmed -> ORDER_APPROVE, qolganlari -> ORDER_UPDATE
 *   /api/admin/categories, /api/admin/products — umumiy CRUD (crud.routes.js)
 */
const express = require('express');
const orders = require('../../modules/orders/orders.service');
const { authenticate } = require('../middleware/authenticate');
const { requireAccess, assertAccess } = require('../middleware/requireAccess');
const metaRoutes = require('./meta.routes');
const crudRoutes = require('./crud.routes');
const { wrap, idOf } = require('./helpers');

const router = express.Router();
router.use(authenticate);

router.use('/meta', metaRoutes);

router.get('/orders', requireAccess('ORDER_VIEW'), wrap(async (req, res) => {
  res.json(await orders.listAll(req.query));
}));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  const status = req.body && req.body.status;
  await assertAccess(req.user, [status === 'confirmed' ? 'ORDER_APPROVE' : 'ORDER_UPDATE']);
  res.json(await orders.updateStatus(idOf(req), req.body));
}));

router.use('/', crudRoutes);

module.exports = router;
