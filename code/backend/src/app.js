// Express ilovasi: xavfsizlik middleware'lari va marshrutlar shu yerda ulanadi
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { corsOrigins } = require('./config/env');
const db = require('./config/db');
const authRoutes = require('./api/routes/auth.routes');
const catalogRoutes = require('./api/routes/catalog.routes');
const cartRoutes = require('./api/routes/cart.routes');
const ordersRoutes = require('./api/routes/orders.routes');
const adminRoutes = require('./api/routes/admin.routes');
const { notFound, errorHandler } = require('./api/middleware/errorHandler');

const app = express();

// Render/Vercel kabi proksi ortida haqiqiy IP'ni olish (rate-limit to'g'ri ishlashi uchun)
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true }));
app.use(express.json({ limit: '100kb' }));

const limiterMessage = (text) => ({ error: text });
// Umumiy cheklov: bir IP'dan 15 daqiqada 300 ta so'rov
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('So\'rovlar juda ko\'p. Birozdan keyin urinib ko\'ring'),
}));
// Login/ro'yxatdan o'tish uchun qattiqroq cheklov (parolni taxmin qilishdan himoya)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limiterMessage('Kirish urinishlari juda ko\'p. 15 daqiqadan keyin qayta urinib ko\'ring'),
});

// Server va baza ishlayaptimi — tekshirish uchun (Render health check ham shuni ishlatadi)
app.get('/api/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
