/**
 * USERS — parol bilan ishlash
 *  - parol hech qachon ochiq saqlanmaydi: scrypt bilan hash qilinadi ("salt:hash")
 *  - password_hash API javobida hech qachon qaytmaydi (publicUser orqali tozalanadi)
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
  const check = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === check.length && crypto.timingSafeEqual(check, expected);
}

/** API javobiga chiqadigan foydalanuvchi ma'lumotlari */
function publicUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    created_at: row.created_at,
  };
}

module.exports = { hashPassword, verifyPassword, publicUser };
