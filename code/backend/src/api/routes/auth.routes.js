/**
 * Xodimlar paneliga kirish (mijozlar uchun akkaunt yo'q):
 *   GET  /api/auth/captcha  -> { captchaId, svg }
 *   POST /api/auth/login    { login, code, captchaId?, captchaAnswer? } -> { accessToken, refreshToken, user }
 *   POST /api/auth/refresh  { refreshToken }  -> { accessToken, refreshToken }  (rotatsiya)
 *   POST /api/auth/logout   { refreshToken }  -> 204
 *   GET  /api/auth/me       (Bearer)          -> { id, fullName, login, role, fullAccess, accesses }
 */
const express = require('express');
const auth = require('../../modules/auth/auth.service');
const { createCaptcha } = require('../../utils/captcha');
const { authenticate } = require('../middleware/authenticate');
const limits = require('../middleware/rateLimits');
const { wrap } = require('./helpers');

const router = express.Router();
const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

// Javoblar keshlanmasin (token va captcha bir martalik)
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/captcha', limits.captcha, wrap(async (req, res) => {
  res.json(await createCaptcha());
}));

router.post('/login', limits.login, wrap(async (req, res) => {
  res.json(await auth.login(req.body, meta(req)));
}));

router.post('/refresh', limits.refresh, wrap(async (req, res) => {
  res.json(await auth.refresh(req.body, meta(req)));
}));

router.post('/logout', wrap(async (req, res) => {
  await auth.logout(req.body);
  res.status(204).end();
}));

router.get('/me', authenticate, wrap(async (req, res) => {
  res.json(await auth.me(req.user.id));
}));

module.exports = router;
