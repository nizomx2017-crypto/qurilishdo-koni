/**
 * Barcha xatolarni bitta joyda ushlab, yagona formatga aylantiradi:
 *   { error: { code, message, details?, ...extra } }
 * Stack trace va bazaning ichki tafsilotlari javobga hech qachon chiqmaydi — faqat server logiga.
 * PostgreSQL xato kodlari: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const HttpError = require('../../utils/httpError');

function send(res, status, code, message, details, extra) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  if (extra) Object.assign(error, extra);
  return res.status(status).json({ error });
}

function notFound(req, res) {
  send(res, 404, 'NOT_FOUND', `Marshrut topilmadi: ${req.method} ${req.path}`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return send(res, err.status, err.code, err.message, err.details, err.extra);
  }
  if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'JSON formati noto\'g\'ri');
  if (err.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Yuborilgan ma\'lumot hajmi juda katta');

  if (err.detail) console.warn('DB:', err.code, err.detail);

  switch (err.code) {
    case '23505': // unique_violation
      return send(res, 409, 'DUPLICATE', 'Bunday qiymat allaqachon mavjud');
    case '23001': // restrict_violation (ON DELETE RESTRICT)
    case '23503': // foreign_key_violation
      // Xabar matni bazaning tiliga bog'liq (ru/en), shuning uchun so'rov metodiga qaraymiz
      return send(res, 409, 'REFERENCED', req.method === 'DELETE'
        ? 'Bu yozuvni o\'chirib bo\'lmaydi: unga boshqa jadvallarda bog\'langan yozuvlar bor'
        : 'Tanlangan bog\'langan yozuv mavjud emas');
    case '23514': // check_violation
      return send(res, 400, 'VALIDATION_ERROR', 'Qiymat qoidaga mos emas');
    case '23502': // not_null_violation
      return send(res, 400, 'VALIDATION_ERROR', `"${err.column}" maydoni bo'sh bo'lishi mumkin emas`);
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
      return send(res, 400, 'VALIDATION_ERROR', 'Qiymat formati noto\'g\'ri');
    case '40P01': // deadlock_detected
    case '40001': // serialization_failure
      return send(res, 409, 'RETRY', 'Bir vaqtda bir nechta o\'zgarish bo\'ldi. Qayta urinib ko\'ring');
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
    case 'ENETUNREACH':
    case 'ETIMEDOUT':
    case '28P01': // invalid_password
    case '3D000': // invalid_catalog_name (baza yo'q)
      console.error('Bazaga ulanish xatosi:', err.code, err.message);
      return send(res, 503, 'DB_UNAVAILABLE', 'Bazaga ulanib bo\'lmadi. Birozdan keyin urinib ko\'ring');
    default:
      console.error(err);
      return send(res, 500, 'INTERNAL', 'Serverda kutilmagan xato');
  }
}

module.exports = { notFound, errorHandler };
