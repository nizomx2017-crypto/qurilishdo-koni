/**
 * REST API marshrutlari — har bir resurs uchun bir xil:
 *
 *   GET    /api/:resource            ro'yxat   ?page=1&limit=10&search=&sort=id&order=desc
 *   GET    /api/:resource/options    select uchun [{id,label}]
 *   GET    /api/:resource/:id        bitta yozuv
 *   POST   /api/:resource            qo'shish
 *   PUT    /api/:resource/:id        tahrirlash
 *   DELETE /api/:resource/:id        o'chirish
 */
const express = require('express');
const crud = require('../../services/crud.service');
const HttpError = require('../../utils/httpError');

const router = express.Router();

// async xatolarni error middleware'ga uzatish
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const idOf = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw new HttpError(400, 'Noto\'g\'ri ID');
  return id;
};

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
