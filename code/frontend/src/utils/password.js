// Parol talablari (backend'dagi siyosat bilan bir xil — haqiqiy tekshiruv serverda) va vaqtinchalik parol generatsiyasi

const MAX_BYTES = 72;

/** Jonli ko'rsatish uchun: [{ ok, text }] */
export function passwordChecks(password, username = '', { current = '', confirm } = {}) {
  const bytes = new TextEncoder().encode(password).length;
  const checks = [
    { ok: password.length >= 8, text: 'Kamida 8 belgi' },
    { ok: /\p{L}/u.test(password), text: 'Kamida bitta harf' },
    { ok: /\d/.test(password), text: 'Kamida bitta raqam' },
    { ok: bytes <= MAX_BYTES, text: `Ko‘pi bilan ${MAX_BYTES} bayt` },
    { ok: !username || password.trim().toLowerCase() !== username.toLowerCase(), text: 'Username bilan bir xil emas' },
  ];
  if (current) checks.push({ ok: !password || password !== current, text: 'Joriy paroldan farq qiladi' });
  if (confirm !== undefined) checks.push({ ok: Boolean(password) && password === confirm, text: 'Takrorlash mos keladi' });
  return checks;
}

export const passwordIsValid = (...args) => passwordChecks(...args).every((c) => c.ok);

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;

function randomIndex(max) {
  // Rejection sampling — modul xatosiz bir tekis taqsimot
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

/** 12 belgili vaqtinchalik parol: har turdan kamida bittadan, o'xshash belgilar (0/O, 1/l/I) yo'q */
export function generatePassword(length = 12) {
  const pick = (set) => set[randomIndex(set.length)];
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
