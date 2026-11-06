/**
 * Barcha xatolarni bitta joyda ushlab, tushunarli JSON javobga aylantiradi.
 * PostgreSQL xato kodlari: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const HttpError = require('../../utils/httpError');

function notFound(req, res) {
  res.status(404).json({ error: `Marshrut topilmadi: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON formati noto\'g\'ri' });
  }

  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ error: 'Bunday qiymat allaqachon mavjud', details: err.detail });
    case '23503': // foreign_key_violation
      return res.status(409).json({
        error: err.message.includes('update or delete')
          ? 'Bu yozuvni o\'chirib bo\'lmaydi: unga boshqa jadvallarda bog\'langan yozuvlar bor'
          : 'Tanlangan bog\'langan yozuv mavjud emas',
        details: err.detail,
      });
    case '23514': // check_violation
      return res.status(400).json({ error: 'Qiymat qoidaga mos emas', details: err.constraint });
    case '23502': // not_null_violation
      return res.status(400).json({ error: `"${err.column}" maydoni bo'sh bo'lishi mumkin emas` });
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
      return res.status(400).json({ error: 'Qiymat formati noto\'g\'ri' });
    case 'ECONNREFUSED':
      return res.status(503).json({ error: 'Bazaga ulanib bo\'lmadi. PostgreSQL ishga tushganini va .env sozlamalarini tekshiring' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Serverda kutilmagan xato' });
  }
}

module.exports = { notFound, errorHandler };
