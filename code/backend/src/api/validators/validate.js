/**
 * Kelgan ma'lumotni (req.body) registry'dagi tavsifga qarab tekshiradi va tozalaydi.
 *  - faqat ruxsat etilgan ustunlar qoladi (SQL injection va ortiqcha maydonlardan himoya)
 *  - turlar o'giriladi (son, matn)
 *  - majburiy maydonlar va select qiymatlari tekshiriladi
 */
const HttpError = require('../../utils/httpError');

function validate(resource, body, mode /* 'create' | 'update' */) {
  const data = {};
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  for (const [name, col] of Object.entries(resource.columns)) {
    if (col.readonly) continue;

    const has = Object.prototype.hasOwnProperty.call(input, name);
    let value = has ? input[name] : undefined;
    if (typeof value === 'string') value = value.trim();
    const empty = value === undefined || value === null || value === '';

    const isRequired = col.required === true || (col.required === 'create' && mode === 'create');

    if (empty) {
      if (!has && mode === 'create' && col.default !== undefined) {
        data[name] = col.default; // yuborilmagan bo'lsa — standart qiymat
      } else if (isRequired && (mode === 'create' || has)) {
        errors[name] = `"${col.label}" majburiy`;
      } else if (has && !col.virtual) {
        data[name] = null; // bo'sh qoldirilgan maydon => NULL
      }
      continue;
    }

    switch (col.type) {
      case 'number':
      case 'money': {
        const n = Number(value);
        if (!Number.isFinite(n)) errors[name] = `"${col.label}" son bo'lishi kerak`;
        else if (n < 0 && col.type === 'money' && name !== 'balance') errors[name] = `"${col.label}" manfiy bo'lmasin`;
        else data[name] = n;
        break;
      }
      case 'ref': {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) errors[name] = `"${col.label}" noto'g'ri tanlangan`;
        else data[name] = n;
        break;
      }
      case 'select':
        if (!col.options.includes(value)) errors[name] = `"${col.label}" faqat: ${col.options.join(', ')}`;
        else data[name] = value;
        break;
      default:
        data[name] = String(value);
    }
  }

  if (Object.keys(errors).length) {
    throw new HttpError(400, 'Ma\'lumotlar noto\'g\'ri to\'ldirilgan', errors);
  }
  return data;
}

module.exports = validate;
