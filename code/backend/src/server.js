// Kirish nuqtasi: .env ni o'qiydi va serverni ishga tushiradi
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API ishga tushdi: http://localhost:${PORT}/api`);
  console.log(`   Tekshirish:      http://localhost:${PORT}/api/health`);
});
