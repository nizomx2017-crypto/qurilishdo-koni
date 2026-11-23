// HTTP status kodi bilan xato. Service'lar shuni throw qiladi, errorHandler esa
// yagona formatga aylantiradi:  { error: { code, message, details?, ...extra } }
const DEFAULT_CODES = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  423: 'ACCOUNT_LOCKED',
  429: 'TOO_MANY_REQUESTS',
};

class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message  foydalanuvchiga ko'rinadigan matn
   * @param {object} [details] maydonlar bo'yicha xatolar
   * @param {string} [code]   mashina o'qiydigan kod (CAPTCHA_REQUIRED, FORBIDDEN, ...)
   * @param {object} [extra]  error obyektiga qo'shiladigan maydonlar (requiredAccess, retryAfterSeconds)
   */
  constructor(status, message, details, code, extra) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code || DEFAULT_CODES[status] || 'ERROR';
    this.extra = extra;
  }
}

module.exports = HttpError;
