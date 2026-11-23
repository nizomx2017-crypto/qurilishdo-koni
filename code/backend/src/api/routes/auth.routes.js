/**
 * Xodimlar paneliga kirish (mijozlar uchun akkaunt yo'q):
 *   GET  /api/auth/captcha  -> { captchaId, svg }
 *   POST /api/auth/login    { username, password, captchaId?, captchaAnswer? }
 *                           -> { accessToken, refreshToken, mustChangePassword, user }
 *   POST /api/auth/refresh  { refreshToken }  -> { accessToken, refreshToken }  (rotatsiya)
 *   POST /api/auth/logout   { refreshToken }  -> 204
 *   GET  /api/auth/me       (Bearer)          -> { id, fullName, username, role, fullAccess, accesses, mustChangePassword }
 *   POST /api/auth/change-password (Bearer) { currentPassword, newPassword } -> yangi token juftligi
 * must_change_password holatida ham /me, /change-password va /logout ishlaydi (qolganlari 403).
 */
const express = require('express');
const auth = require('../../modules/auth/auth.service');
const { createCaptcha } = require('../../utils/captcha');
const { authenticateAllowingPasswordChange } = require('../middleware/authenticate');
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

router.get('/me', authenticateAllowingPasswordChange, wrap(async (req, res) => {
  res.json(await auth.me(req.user.id));
}));

router.post('/change-password', limits.login, authenticateAllowingPasswordChange, wrap(async (req, res) => {
  res.json(await auth.changePassword(req.user, req.body, meta(req)));
}));

module.exports = router;
