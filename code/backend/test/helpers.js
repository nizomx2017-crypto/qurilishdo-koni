/**
 * Test muhiti: alohida baza (standart: qurilish_dokoni_test), har bir test fayli boshida noldan quriladi.
 * XAVFSIZLIK: .env dagi DATABASE_URL (masalan Supabase) testda HECH QACHON ishlatilmaydi —
 * aks holda testlar ishlab turgan bazani tozalab yuborardi. Bulut test bazasi kerak bo'lsa: TEST_DATABASE_URL.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'qurilish_dokoni_test';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
if (!process.env.DATABASE_URL && !/test/i.test(process.env.DB_NAME)) {
  throw new Error('Test bazasi nomida "test" bo\'lishi shart (TEST_DB_NAME)');
}

process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-0123456789-abcdef';
process.env.CAPTCHA_SECRET = 'test-captcha-secret-0123456789-0123456789-abcdef';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_INITIAL_PASSWORD = 'Boshlang1ch';
delete process.env.ADMIN_LOGIN;
delete process.env.ADMIN_INITIAL_CODE;
delete process.env.FRONTEND_URL;
delete process.env.CORS_ORIGIN;

const supertest = require('supertest');
const { resetDatabase } = require('../scripts/db-init');
const app = require('../src/app');
const db = require('../src/config/db');
const { hashAnswer } = require('../src/utils/captcha');

// Parol o'zgarganda shu obyekt yangilanadi (readyTokens)
const ADMIN = { username: 'admin', password: 'Boshlang1ch' };
let ipSeq = 0;

/** Har bir ssenariy o'z IP'sidan — rate-limit va captcha hisoblagichlari bir-biriga aralashmasin */
function newIp() {
  ipSeq += 1;
  return `10.${Math.floor(ipSeq / 250) % 250}.${ipSeq % 250}.${process.pid % 250}`;
}

function api(ip = newIp()) {
  const wrap = (method) => (url) => supertest(app)[method](url).set('X-Forwarded-For', ip);
  return { ip, get: wrap('get'), post: wrap('post'), put: wrap('put'), patch: wrap('patch'), delete: wrap('delete') };
}

async function setup() {
  await resetDatabase({ log: () => {} });
}

async function teardown() {
  await db.pool.end();
}

async function login(creds, extra = {}, client = api()) {
  return client.post('/api/auth/login').send({ ...creds, ...extra });
}

async function tokenFor(creds) {
  const res = await login(creds);
  if (res.status !== 200) throw new Error(`login ${creds.username}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

let pwSeq = 0;
/** Kiradi; vaqtinchalik parol bo'lsa — yangisiga almashtiradi (creds.password yangilanadi). Ishlaydigan tokenlar */
async function readyTokens(creds) {
  const s = await tokenFor(creds);
  if (!s.mustChangePassword) return s;
  pwSeq += 1;
  const newPassword = `Yangi${pwSeq}parol${Date.now() % 1000}`;
  const res = await api().post('/api/auth/change-password').set(bearer(s.accessToken))
    .send({ currentPassword: creds.password, newPassword });
  if (res.status !== 200) throw new Error(`change-password ${creds.username}: ${res.status} ${JSON.stringify(res.body)}`);
  creds.password = newPassword;
  return res.body;
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** Javobi ma'lum captcha (test bazaga to'g'ridan-to'g'ri yoziladi — ilovada "orqa eshik" yo'q) */
async function knownCaptcha(answer = 'abcde') {
  const { rows } = await db.query(
    `INSERT INTO captchas (answer_hash, expires_at) VALUES ($1, NOW() + INTERVAL '2 minutes') RETURNING id`,
    [hashAnswer(answer)]
  );
  return { captchaId: rows[0].id, captchaAnswer: answer };
}

async function roleIdByName(name) {
  const { rows } = await db.query('SELECT id FROM roles WHERE name = $1', [name]);
  return rows[0].id;
}

/** Admin token bilan xodim yaratadi (vaqtinchalik parol bilan) -> { id, username, password } */
async function createStaff(adminToken, { fullName = 'Test Xodim', username, roleName, password = 'Vaqtin4lik' }) {
  const res = await api().post('/api/users').set(bearer(adminToken))
    .send({ fullName, username, password, roleId: await roleIdByName(roleName) });
  if (res.status !== 201) throw new Error(`createStaff: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, username, password };
}

module.exports = {
  app, db, api, newIp, setup, teardown, login, tokenFor, readyTokens, bearer, knownCaptcha, roleIdByName, createStaff, ADMIN,
};
