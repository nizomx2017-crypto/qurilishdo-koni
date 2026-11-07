/**
 * Savatcha (faqat login qilgan foydalanuvchi, faqat o'z savatchasi):
 *   GET    /api/cart                -> { items, total, count }
 *   POST   /api/cart/items          { product_id, quantity? }  qo'shish (bor bo'lsa miqdor oshadi)
 *   PUT    /api/cart/items/:id      { quantity }               miqdorni o'zgartirish
 *   DELETE /api/cart/items/:id                                 olib tashlash
 *   DELETE /api/cart                                           savatchani tozalash
 */
const express = require('express');
const cart = require('../../modules/cart/cart.service');
const { authenticate } = require('../middleware/auth');
const { wrap, idOf } = require('./helpers');

const router = express.Router();
router.use(authenticate);

router.get('/', wrap(async (req, res) => {
  res.json(await cart.getCart(req.user.id));
}));

router.post('/items', wrap(async (req, res) => {
  res.status(201).json(await cart.addItem(req.user.id, req.body));
}));

router.put('/items/:id', wrap(async (req, res) => {
  res.json(await cart.updateItem(req.user.id, idOf(req), req.body));
}));

router.delete('/items/:id', wrap(async (req, res) => {
  res.json(await cart.removeItem(req.user.id, idOf(req)));
}));

router.delete('/', wrap(async (req, res) => {
  res.json(await cart.clear(req.user.id));
}));

module.exports = router;
