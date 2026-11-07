/**
 * Ommaviy katalog (login shart emas):
 *   GET /api/categories                 faol kategoriyalar + mahsulotlar soni
 *   GET /api/products                   ?search=&category_id=&sort=name|price|id&order=asc|desc&page=&limit=
 *   GET /api/products/:id               bitta mahsulot
 */
const express = require('express');
const catalog = require('../../modules/catalog/catalog.service');
const { wrap, idOf } = require('./helpers');

const router = express.Router();

router.get('/categories', wrap(async (req, res) => {
  res.json(await catalog.listCategories());
}));

router.get('/products', wrap(async (req, res) => {
  res.json(await catalog.listProducts(req.query));
}));

router.get('/products/:id', wrap(async (req, res) => {
  res.json(await catalog.getProduct(idOf(req)));
}));

module.exports = router;
