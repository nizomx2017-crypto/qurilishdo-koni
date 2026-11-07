/**
 * Kelgan ma'lumotni (req.body) tavsifga (registry yoki kichik sxema) qarab tekshiradi va tozalaydi.
 *  - faqat ruxsat etilgan ustunlar qoladi (SQL injection va ortiqcha maydonlardan himoya)
 *  - turlar o'giriladi (son, matn)
 *  - majburiy maydonlar, chegaralar va select qiymatlari tekshiriladi
 *
 * Ustun tavsifidagi qo'shimcha qoidalar:
 *   min, max         : son uchun chegaralar
 *   integer          : butun son bo'lishi shart
 *   minLength, maxLength : matn uzunligi
 *   type: 'email'    : email formati
 */
const HttpError = require('../../utils/httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkNumber(col, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { error: `"${col.label}" son bo'lishi kerak` };
  if (col.integer && !Number.isInteger(n)) return { error: `"${col.label}" butun son bo'lishi kerak` };
  const min = col.min !== undefined ? col.min : col.type === 'money' ? 0 : undefined;
  if (min !== undefined && n < min) return { error: `"${col.label}" ${min} dan kichik bo'lmasin` };
  if (col.max !== undefined && n > col.max) return { error: `"${col.label}" ${col.max} dan katta bo'lmasin` };
  return { value: n };
}

function checkText(col, value) {
  const s = String(value);
  if (col.minLength && s.length < col.minLength) {
    return { error: `"${col.label}" kamida ${col.minLength} ta belgi bo'lsin` };
  }
  if (col.maxLength && s.length > col.maxLength) {
    return { error: `"${col.label}" ${col.maxLength} ta belgidan oshmasin` };
  }
  if (col.type === 'email' && !EMAIL_RE.test(s)) return { error: `"${col.label}" formati noto'g'ri` };
  return { value: col.type === 'email' ? s.toLowerCase() : s };
}

function validate(resource, body, mode /* 'create' | 'update' */) {
  const data = {};
  const errors = {};
  const input = body && typeof body === 'object' ? body : {};

  for (const [name, col] of Object.entries(resource.columns)) {
    if (col.readonly) continue;

    const has = Object.prototype.hasOwnProperty.call(input, name);
    let value = has ? input[name] : undefined;
    if (typeof value === 'string' && col.type !== 'password') value = value.trim();
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

    let result;
    switch (col.type) {
      case 'number':
      case 'money':
        result = checkNumber(col, value);
        break;
      case 'ref': {
        const n = Number(value);
        result = Number.isInteger(n) && n > 0 && n <= 2147483647
          ? { value: n }
          : { error: `"${col.label}" noto'g'ri tanlangan` };
        break;
      }
      case 'select':
        result = col.options.includes(value)
          ? { value }
          : { error: `"${col.label}" faqat: ${col.options.join(', ')}` };
        break;
      default:
        result = checkText(col, value);
    }

    if (result.error) errors[name] = result.error;
    else data[name] = result.value;
  }

  if (Object.keys(errors).length) {
    throw new HttpError(400, 'Ma\'lumotlar noto\'g\'ri to\'ldirilgan', errors);
  }
  return data;
}

module.exports = validate;
