// Muhit o'zgaruvchilaridan olinadigan umumiy sozlamalar.
// Majburiy qiymatlar validateEnv() da tekshiriladi — server.js ishga tushishdan oldin chaqiradi.
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Eski nomlar (JWT_SECRET, CORS_ORIGIN) ham o'qiladi — Render'dagi mavjud deploy buzilmasligi uchun
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';
const captchaSecret = process.env.CAPTCHA_SECRET || '';

// CORS: vergul bilan bir nechta manzil yozish mumkin (masalan Vercel preview). Oxiridagi "/" olib tashlanadi
// (brauzer Origin sarlavhasini "/" siz yuboradi). Bo'sh bo'lsa — lokalda hammaga ruxsat,
// production'da esa boshqa domendan keladigan so'rovlarga ruxsat berilmaydi.
const corsOrigins = String(process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const MIN_SECRET_BYTES = 32;

/** Yetishmayotgan yoki zaif sozlamalar ro'yxati (bo'sh massiv — hammasi joyida) */
function validateEnv() {
  const errors = [];
  const gen = 'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"';
  if (Buffer.byteLength(jwtAccessSecret) < MIN_SECRET_BYTES) {
    errors.push(`JWT_ACCESS_SECRET kamida ${MIN_SECRET_BYTES} bayt bo'lsin. Yaratish: ${gen}`);
  }
  if (Buffer.byteLength(captchaSecret) < MIN_SECRET_BYTES) {
    errors.push(`CAPTCHA_SECRET kamida ${MIN_SECRET_BYTES} bayt bo'lsin. Yaratish: ${gen}`);
  }
  if (jwtAccessSecret && jwtAccessSecret === captchaSecret) {
    errors.push('JWT_ACCESS_SECRET va CAPTCHA_SECRET har xil bo\'lsin');
  }
  if (isProduction) {
    if (!process.env.DATABASE_URL) errors.push('DATABASE_URL o\'rnatilmagan (Supabase -> Connect -> Session pooler)');
    if (!corsOrigins.length) errors.push('FRONTEND_URL o\'rnatilmagan (masalan https://qurilishdokoni.vercel.app)');
  }
  return errors;
}

module.exports = {
  isProduction,
  isTest,
  jwtAccessSecret,
  captchaSecret,
  corsOrigins,
  validateEnv,
};
