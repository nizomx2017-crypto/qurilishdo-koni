/**
 * Xodim paroli:
 *  - siyosat: kamida 8 belgi, kamida 1 harf va 1 raqam, ko'pi bilan 72 bayt (bcrypt chegarasi),
 *    username bilan bir xil emas;
 *  - saqlash: faqat bcrypt hash (cost 12);
 *  - vaqtinchalik parol generatsiyasi: 12 belgi, crypto.randomInt, o'xshash belgilar (0/O, 1/l/I) yo'q.
 * Username: kichik harfga o'tkaziladi, 3–32 belgi, faqat a-z 0-9 _ .
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12;
const MIN_LENGTH = 8;
const MAX_BYTES = 72;
const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;
const GENERATED_LENGTH = 12;

function normalizeUsername(input) {
  return typeof input === 'string' ? input.trim().toLowerCase() : '';
}

function isValidUsername(username) {
  return USERNAME_RE.test(username);
}

/** Siyosatga mos kelmasa — xato matni, mos kelsa — null */
function passwordProblem(password, username) {
  if (typeof password !== 'string' || !password) return 'Parol kiriting';
  if (password.length < MIN_LENGTH) return `Parol kamida ${MIN_LENGTH} belgi bo'lsin`;
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) return `Parol ${MAX_BYTES} baytdan oshmasin`;
  if (!/\p{L}/u.test(password)) return 'Parolda kamida bitta harf bo\'lsin';
  if (!/\d/.test(password)) return 'Parolda kamida bitta raqam bo\'lsin';
  if (username && password.trim().toLowerCase() === String(username).toLowerCase()) {
    return 'Parol username bilan bir xil bo\'lmasin';
  }
  return null;
}

function generatePassword() {
  const pick = (set) => set[crypto.randomInt(set.length)];
  // Har turdan kamida bittadan, qolgani aralash; keyin tasodifiy aralashtiriladi
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < GENERATED_LENGTH) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Foydalanuvchi topilmaganda ham bcrypt bilan solishtiramiz — javob vaqti bir xil bo'lsin
// (vaqtga qarab username mavjudligini aniqlab bo'lmasin). Hash bir marta, kerak bo'lganda hisoblanadi.
let dummyHash = null;
function getDummyHash() {
  if (!dummyHash) dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_COST);
  return dummyHash;
}

async function verifyPassword(password, hash) {
  const ok = await bcrypt.compare(typeof password === 'string' ? password : '', hash || getDummyHash());
  return Boolean(hash) && ok;
}

module.exports = {
  normalizeUsername,
  isValidUsername,
  passwordProblem,
  generatePassword,
  hashPassword,
  verifyPassword,
  getDummyHash,
  MAX_BYTES,
};
