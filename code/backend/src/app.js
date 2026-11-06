// Express ilovasi: middleware'lar va marshrutlar shu yerda ulanadi
const express = require('express');
const cors = require('cors');

const metaRoutes = require('./api/routes/meta.routes');
const crudRoutes = require('./api/routes/crud.routes');
const { notFound, errorHandler } = require('./api/middleware/errorHandler');
const db = require('./config/db');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Server va baza ishlayaptimi — tekshirish uchun
app.get('/api/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/meta', metaRoutes);
app.use('/api', crudRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
