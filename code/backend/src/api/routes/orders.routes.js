/**
 * Mijoz buyurtmasi (ochiq, akkauntsiz):
 *   POST /api/orders  { customer_name, phone, address, note?, items: [{ product_id, quantity }],
 *                       captchaId, captchaAnswer }
 * Himoya: IP bo'yicha rate-limit + har doim captcha. Narx va qoldiq serverda qayta hisoblanadi.
 */
const express = require('express');
const orders = require('../../modules/orders/orders.service');
const { verifyCaptcha } = require('../../utils/captcha');
const HttpError = require('../../utils/httpError');
const limits = require('../middleware/rateLimits');
const { wrap } = require('./helpers');

const router = express.Router();

router.post('/', limits.publicOrder, wrap(async (req, res) => {
  // Avval maydonlar: xato bo'lsa captcha behuda yonib ketmasin
  const data = orders.validateCheckout(req.body);
  const { captchaId, captchaAnswer } = req.body || {};
  if (!captchaId || !captchaAnswer) {
    throw new HttpError(400, 'Rasmdagi belgilarni kiriting', undefined, 'CAPTCHA_REQUIRED');
  }
  if (!(await verifyCaptcha(captchaId, captchaAnswer))) {
    throw new HttpError(400, 'Rasmdagi belgilar noto\'g\'ri. Yangi rasm bilan qayta urinib ko\'ring', undefined, 'CAPTCHA_INVALID');
  }
  res.status(201).json(await orders.checkout(data));
}));

module.exports = router;
