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

// CORS: vergul bilan bir nechta manzil yozish mumkin. Bo'sh bo'lsa — hammaga ruxsat (faqat lokal uchun).
const corsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = {
  isProduction,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins,
};
