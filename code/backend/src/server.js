// Kirish nuqtasi: .env ni o'qiydi, majburiy sozlamalarni tekshiradi va serverni ishga tushiradi
require('dotenv').config();
const { validateEnv } = require('./config/env');

const envErrors = validateEnv();
if (envErrors.length) {
  console.error('❌ Server ishga tushmadi — sozlamalar yetarli emas (.env yoki Render Environment):');
  envErrors.forEach((e) => console.error(`   • ${e}`));
  process.exit(1);
}

const app = require('./app');
const { pool } = require('./config/db');
const { cleanupExpired } = require('./modules/maintenance');

const PORT = process.env.PORT || 5000;
const CLEANUP_EVERY_MS = 10 * 60 * 1000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API ishga tushdi: http://localhost:${PORT}/api`);
  console.log(`   Tekshirish:      http://localhost:${PORT}/api/health`);
});

const runCleanup = () => cleanupExpired().catch((err) => console.error('Tozalashda xato:', err.message));
setTimeout(runCleanup, 30 * 1000).unref();
setInterval(runCleanup, CLEANUP_EVERY_MS).unref();

// Render deploy/restart'da SIGTERM yuboradi: yangi so'rov qabul qilmay, ochiqlarini tugatib chiqamiz
process.on('SIGTERM', () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 10 * 1000).unref();
});
