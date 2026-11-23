// Express ilovasi: xavfsizlik middleware'lari va marshrutlar shu yerda ulanadi
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { corsOrigins, isProduction } = require('./config/env');
const db = require('./config/db');
const limits = require('./api/middleware/rateLimits');
const authRoutes = require('./api/routes/auth.routes');
const catalogRoutes = require('./api/routes/catalog.routes');
const ordersRoutes = require('./api/routes/orders.routes');
const adminRoutes = require('./api/routes/admin.routes');
const managementRoutes = require('./api/routes/management.routes');
const { notFound, errorHandler } = require('./api/middleware/errorHandler');

const app = express();

// Render proksi ortida haqiqiy IP'ni olish (rate-limit va login_attempts to'g'ri ishlashi uchun)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// API faqat JSON qaytaradi. helmet standart sarlavhalari (CSP, nosniff, frameguard...) frontend'ning
// fetch so'rovlariga xalaqit bermaydi: Cross-Origin-Resource-Policy CORS so'rovlariga ta'sir qilmaydi.
app.use(helmet());
// Production'da FRONTEND_URL bo'sh bo'lsa hech qaysi begona domenga ruxsat yo'q
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : !isProduction,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', limits.general);

// Server va baza ishlayaptimi — tekshirish uchun (Render health check ham shuni ishlatadi)
app.get('/api/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    next(err);
  }
});

// Ochiq (mijoz): katalog va buyurtma
app.use('/api', catalogRoutes);
app.use('/api/orders', ordersRoutes);
// Xodimlar paneli
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', managementRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
