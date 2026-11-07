/**
 * Foydalanuvchi buyurtmalari (login shart):
 *   POST /api/orders     { phone, address, note? }  savatchadan buyurtma yaratish
 *   GET  /api/orders     o'z buyurtmalari (qatorlari bilan)
 */
const express = require('express');
const orders = require('../../modules/orders/orders.service');
const { authenticate } = require('../middleware/auth');
const { wrap } = require('./helpers');

const router = express.Router();
router.use(authenticate);

router.post('/', wrap(async (req, res) => {
  res.status(201).json(await orders.checkout(req.user.id, req.body));
}));

router.get('/', wrap(async (req, res) => {
  res.json(await orders.listMine(req.user.id));
}));

module.exports = router;
