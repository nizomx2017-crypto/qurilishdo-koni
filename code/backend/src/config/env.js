// Muhit o'zgaruvchilaridan olinadigan umumiy sozlamalar
const isProduction = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET o\'rnatilmagan. Production rejimida u majburiy.');
  }
  jwtSecret = 'dev-faqat-lokal-uchun-maxfiy-kalit';
  console.warn('⚠️  JWT_SECRET yo\'q — lokal rejim uchun vaqtinchalik kalit ishlatilmoqda.');
}

// CORS: vergul bilan bir nechta manzil yozish mumkin. Oxiridagi "/" olib tashlanadi
// (brauzer Origin sarlavhasini "/" siz yuboradi). Bo'sh bo'lsa — lokalda hammaga ruxsat,
// production'da esa boshqa domendan keladigan so'rovlarga ruxsat berilmaydi.
const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
if (isProduction && !corsOrigins.length) {
  console.warn('⚠️  CORS_ORIGIN o\'rnatilmagan — boshqa domendagi frontend API\'ga murojaat qila olmaydi.');
}

module.exports = {
  isProduction,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins,
};
