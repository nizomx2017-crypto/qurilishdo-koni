/**
 * GET /api/admin/meta — admin panel uchun resurslar tavsifi.
 * Frontend shu ma'lumotdan jadval ustunlarini va qo'shish/tahrirlash formalarini quradi.
 */
const express = require('express');
const { resources } = require('../../modules/registry');

const router = express.Router();

router.get('/', (req, res) => {
  const meta = Object.entries(resources).map(([key, r]) => ({
    key,
    label: r.label,
    columns: Object.entries(r.columns).map(([name, c]) => ({ name, ...c })),
  }));
  res.json(meta);
});

module.exports = router;
