/**
 * USERS — biznes mantiq
 *  - parol hech qachon ochiq saqlanmaydi: scrypt bilan hash qilinadi
 *  - password_hash API javobida qaytmaydi (registry'da u ustun sifatida yo'q)
 */
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(check, Buffer.from(hash, 'hex'));
}

function applyPassword(data) {
  const { password, ...rest } = data;
  if (password) rest.password_hash = hashPassword(password);
  return rest;
}

module.exports = {
  hashPassword,
  verifyPassword,
  beforeCreate: async (data) => applyPassword(data),
  // Tahrirlashda parol bo'sh qoldirilsa — eski parol o'zgarmaydi
  beforeUpdate: async (data) => applyPassword(data),
};
