// So'rovlar sonini cheklash (IP bo'yicha). app.set('trust proxy', 1) tufayli Render ortidagi haqiqiy IP olinadi.
const rateLimit = require('express-rate-limit');

const WINDOW = 15 * 60 * 1000;

const limiter = (limit, message) => rateLimit({
  windowMs: WINDOW,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message } }),
});

module.exports = {
  // Umumiy: 15 daqiqada 300 ta
  general: limiter(300, 'So\'rovlar juda ko\'p. Birozdan keyin urinib ko\'ring'),
  // Login: 15 daqiqada 20 ta (kodni taxmin qilishdan himoya)
  login: limiter(20, 'Kirish urinishlari juda ko\'p. 15 daqiqadan keyin qayta urinib ko\'ring'),
  // Captcha rasmi: 15 daqiqada 30 ta
  captcha: limiter(30, 'Juda ko\'p so\'rov. Birozdan keyin urinib ko\'ring'),
  // Refresh: 15 daqiqada 60 ta
  refresh: limiter(60, 'Juda ko\'p so\'rov. Birozdan keyin urinib ko\'ring'),
  // Mijozning ochiq buyurtma formasi: 15 daqiqada 10 ta
  publicOrder: limiter(10, 'Juda ko\'p buyurtma yuborildi. Birozdan keyin urinib ko\'ring'),
};
