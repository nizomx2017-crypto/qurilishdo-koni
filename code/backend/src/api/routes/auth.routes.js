/**
 *   POST /api/auth/register   { full_name, email, phone?, password }  -> { token, user }
 *   POST /api/auth/login      { email, password }                     -> { token, user }
 *   GET  /api/auth/me         (token bilan)                           -> user
 */
const express = require('express');
const auth = require('../../modules/auth/auth.service');
const { publicUser } = require('../../modules/users/users.service');
const { authenticate } = require('../middleware/auth');
const { wrap } = require('./helpers');

const router = express.Router();

router.post('/register', wrap(async (req, res) => {
  res.status(201).json(await auth.register(req.body));
}));

router.post('/login', wrap(async (req, res) => {
  res.json(await auth.login(req.body));
}));

router.get('/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});

module.exports = router;
