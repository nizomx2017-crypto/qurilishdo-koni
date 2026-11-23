/**
 * Boshqaruv API (xodimlar, rollar, access'lar, kirish jurnali). Hammasi authenticate dan o'tadi.
 * Kim nimani boshqarishi (ADMIN > DIRECTOR > MANAGER) service qatlamida ham tekshiriladi.
 *
 *   GET   /api/users                       ADMIN, DIRECTOR   ?search=&roleType=&isActive=&page=&limit=
 *   POST  /api/users                       ADMIN, DIRECTOR   { fullName, login, roleId } -> { user, code }
 *   PATCH /api/users/:id                   ADMIN, DIRECTOR   { fullName?, login?, roleId? }
 *   PATCH /api/users/:id/status            ADMIN, DIRECTOR   { isActive }
 *   POST  /api/users/:id/regenerate-code   ADMIN, DIRECTOR   -> { user, code }
 *   GET/POST /api/roles, PUT/DELETE /api/roles/:id           ADMIN, DIRECTOR
 *   PUT   /api/roles/:id/accesses          ADMIN, DIRECTOR   { accessIds: [] }
 *   GET   /api/accesses                    ADMIN, DIRECTOR   sahifalar bo'yicha guruhlangan
 *   GET   /api/login-attempts              faqat ADMIN       ?page=&limit=&login=&ip=&success=&reason=
 */
const express = require('express');
const users = require('../../modules/users/users.service');
const roles = require('../../modules/roles/roles.service');
const accesses = require('../../modules/accesses/accesses.service');
const loginAttempts = require('../../modules/loginAttempts/loginAttempts.service');
const { authenticate } = require('../middleware/authenticate');
const requireRoleType = require('../middleware/requireRoleType');
const { wrap, idOf } = require('./helpers');

const router = express.Router();
const managers = [authenticate, requireRoleType('ADMIN', 'DIRECTOR')];

// Yangi kod javobda bir marta qaytadi — hech qayerda keshlanmasin
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};

router.get('/users', managers, wrap(async (req, res) => {
  res.json(await users.list(req.user, req.query));
}));
router.post('/users', managers, noStore, wrap(async (req, res) => {
  res.status(201).json(await users.create(req.user, req.body));
}));
router.patch('/users/:id', managers, wrap(async (req, res) => {
  res.json(await users.update(req.user, idOf(req), req.body));
}));
router.patch('/users/:id/status', managers, wrap(async (req, res) => {
  res.json(await users.setStatus(req.user, idOf(req), req.body));
}));
router.post('/users/:id/regenerate-code', managers, noStore, wrap(async (req, res) => {
  res.json(await users.regenerateCode(req.user, idOf(req)));
}));

router.get('/roles', managers, wrap(async (req, res) => {
  res.json(await roles.list(req.user));
}));
router.post('/roles', managers, wrap(async (req, res) => {
  res.status(201).json(await roles.create(req.user, req.body));
}));
router.put('/roles/:id', managers, wrap(async (req, res) => {
  res.json(await roles.update(req.user, idOf(req), req.body));
}));
router.delete('/roles/:id', managers, wrap(async (req, res) => {
  res.json(await roles.remove(req.user, idOf(req)));
}));
router.put('/roles/:id/accesses', managers, wrap(async (req, res) => {
  res.json(await roles.setAccesses(req.user, idOf(req), req.body));
}));

router.get('/accesses', managers, wrap(async (req, res) => {
  res.json(await accesses.listGrouped());
}));

router.get('/login-attempts', authenticate, requireRoleType('ADMIN'), wrap(async (req, res) => {
  res.json(await loginAttempts.list(req.query));
}));

module.exports = router;
