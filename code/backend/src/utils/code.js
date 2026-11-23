/**
 * Xodimning kirish kodi: 8 belgi, "XXXX-XXXX" ko'rinishida.
 * Alifboda bir-biriga o'xshash belgilar yo'q (0/O, 1/I/L), shuning uchun qog'ozdan o'qish oson.
 * Bazada faqat bcrypt hash (cost 12) saqlanadi. Tekshirishdan oldin tire/bo'shliq olib tashlanadi
 * va katta harfga o'tkaziladi: "abcd-2345", "ABCD 2345", "abcd2345" — bir xil kod.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const BCRYPT_COST = 12;
const MAX_INPUT = 64; // bcrypt 72 baytdan ortig'ini e'tiborsiz qoldiradi; uzun kiritma bilan CPU'ni band qilmaslik

function normalizeCode(input) {
  return String(input ?? '').slice(0, MAX_INPUT).replace(/[\s-]/g, '').toUpperCase();
}

function formatCode(normalized) {
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

function isValidCodeFormat(input) {
  const n = normalizeCode(input);
  return n.length === CODE_LENGTH && [...n].every((ch) => ALPHABET.includes(ch));
}

function generateCode() {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return formatCode(out);
}

function hashCode(code) {
  return bcrypt.hash(normalizeCode(code), BCRYPT_COST);
}

// Foydalanuvchi topilmaganda ham bcrypt bilan solishtiramiz — javob vaqti bir xil bo'lsin
// (vaqtga qarab login mavjudligini aniqlab bo'lmasin). Hash bir marta, kerak bo'lganda hisoblanadi.
let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);
  return dummyHash;
}

async function verifyCode(code, hash) {
  const ok = await bcrypt.compare(normalizeCode(code), hash || getDummyHash());
  return Boolean(hash) && ok;
}

module.exports = {
  ALPHABET, generateCode, normalizeCode, formatCode, isValidCodeFormat, hashCode, verifyCode, getDummyHash,
};
