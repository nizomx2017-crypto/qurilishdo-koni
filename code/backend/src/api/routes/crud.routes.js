/**
 * Panel uchun umumiy CRUD marshrutlari (registry'dagi har bir resurs: categories, products).
 * /api/admin ostida ulanadi (oldidan authenticate). Har bir amal resursning sahifa kodi bo'yicha
 * access talab qiladi, masalan products -> PRODUCT_*:
 *
 *   GET    /api/admin/:resource            ro'yxat          *_VIEW
 *   GET    /api/admin/:resource/options    select uchun     *_VIEW yoki shu resursga bog'langan resurs huquqi
 *   GET    /api/admin/:resource/:id        bitta yozuv      *_VIEW
 *   POST   /api/admin/:resource            qo'shish         *_CREATE
 *   PUT    /api/admin/:resource/:id        tahrirlash       *_UPDATE (+ status o'zgarsa *_ARCHIVE)
 *   DELETE /api/admin/:resource/:id        o'chirish        *_DELETE
 */
const express = require('express');
const crud = require('../../services/crud.service');
const HttpError = require('../../utils/httpError');
const { getResource, resources } = require('../../modules/registry');
const { assertAccess } = require('../middleware/requireAccess');
const { wrap, idOf } = require('./helpers');

const router = express.Router();

function resourceOf(req) {
  const resource = getResource(req.params.resource);
  if (!resource) throw new HttpError(404, `"${req.params.resource}" degan bo'lim topilmadi`);
  return resource;
}

const access = (action) => wrap(async (req, res, next) => {
  await assertAccess(req.user, [`${resourceOf(req).page}_${action}`]);
  next();
});

// Select ro'yxati: masalan kategoriyalar ro'yxati mahsulot formasida ham kerak
const optionsAccess = wrap(async (req, res, next) => {
  const resource = resourceOf(req);
  const codes = [`${resource.page}_VIEW`];
  Object.values(resources).forEach((r) => {
    if (Object.values(r.columns).some((c) => c.type === 'ref' && getResource(c.ref) === resource)) {
      codes.push(`${r.page}_VIEW`, `${r.page}_CREATE`, `${r.page}_UPDATE`);
    }
  });
  await assertAccess(req.user, codes, 'any');
  next();
});

router.get('/:resource', access('VIEW'), wrap(async (req, res) => {
  res.json(await crud.list(req.params.resource, req.query));
}));

router.get('/:resource/options', optionsAccess, wrap(async (req, res) => {
  res.json(await crud.options(req.params.resource));
}));

router.get('/:resource/:id', access('VIEW'), wrap(async (req, res) => {
  res.json(await crud.getById(req.params.resource, idOf(req)));
}));

router.post('/:resource', access('CREATE'), wrap(async (req, res) => {
  res.status(201).json(await crud.create(req.params.resource, req.body));
}));

router.put('/:resource/:id', access('UPDATE'), wrap(async (req, res) => {
  const resource = resourceOf(req);
  const id = idOf(req);
  // Holatni (faol/nofaol) o'zgartirish — arxivlash, alohida huquq
  if (resource.columns.status && req.body && Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    const current = await crud.getById(req.params.resource, id);
    if (req.body.status !== current.status) await assertAccess(req.user, [`${resource.page}_ARCHIVE`]);
  }
  res.json(await crud.update(req.params.resource, id, req.body));
}));

router.delete('/:resource/:id', access('DELETE'), wrap(async (req, res) => {
  res.json(await crud.remove(req.params.resource, idOf(req)));
}));

module.exports = router;
