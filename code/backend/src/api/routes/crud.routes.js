/**
 * Admin uchun umumiy CRUD marshrutlari (registry'dagi har bir resurs: categories, products).
 * /api/admin ostida ulanadi, shuning uchun oldidan authenticate + requireAdmin o'tadi.
 *
 *   GET    /api/admin/:resource            ro'yxat   ?page=1&limit=10&search=&sort=id&order=desc
 *   GET    /api/admin/:resource/options    select uchun [{id,label}]
 *   GET    /api/admin/:resource/:id        bitta yozuv
 *   POST   /api/admin/:resource            qo'shish
 *   PUT    /api/admin/:resource/:id        tahrirlash
 *   DELETE /api/admin/:resource/:id        o'chirish
 */
const express = require('express');
const crud = require('../../services/crud.service');
const { wrap, idOf } = require('./helpers');

const router = express.Router();

router.get('/:resource', wrap(async (req, res) => {
  res.json(await crud.list(req.params.resource, req.query));
}));

router.get('/:resource/options', wrap(async (req, res) => {
  res.json(await crud.options(req.params.resource));
}));

router.get('/:resource/:id', wrap(async (req, res) => {
  res.json(await crud.getById(req.params.resource, idOf(req)));
}));

router.post('/:resource', wrap(async (req, res) => {
  res.status(201).json(await crud.create(req.params.resource, req.body));
}));

router.put('/:resource/:id', wrap(async (req, res) => {
  res.json(await crud.update(req.params.resource, idOf(req), req.body));
}));

router.delete('/:resource/:id', wrap(async (req, res) => {
  res.json(await crud.remove(req.params.resource, idOf(req)));
}));

module.exports = router;
