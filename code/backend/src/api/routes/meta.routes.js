/**
 * GET /api/meta — frontend uchun barcha bo'limlar tavsifi.
 * Frontend shu ma'lumotdan chap menyuni, jadval ustunlarini va formalarni quradi.
 */
const express = require('express');
const { resources } = require('../../modules/registry');

const router = express.Router();

router.get('/', (req, res) => {
  const meta = Object.entries(resources).map(([key, r]) => ({
    key,
    label: r.label,
    group: r.group,
    columns: Object.entries(r.columns).map(([name, c]) => ({ name, ...c })),
  }));
  res.json(meta);
});

module.exports = router;
