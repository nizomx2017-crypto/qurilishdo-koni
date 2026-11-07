/**
 * AUTH — ro'yxatdan o'tish va login
 *  - yangi foydalanuvchi har doim 'user' roli bilan yaratiladi (admin bo'lib ro'yxatdan o'tib bo'lmaydi)
 *  - login xatosida qaysi maydon noto'g'ri ekanini aytmaymiz (email borligini oshkor qilmaslik uchun)
 */
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const validate = require('../../api/validators/validate');
const HttpError = require('../../utils/httpError');
const { jwtSecret, jwtExpiresIn } = require('../../config/env');
const { hashPassword, verifyPassword, publicUser } = require('../users/users.service');

const registerSchema = {
  columns: {
    full_name: { label: 'F.I.Sh.', type: 'text', required: true, minLength: 2, maxLength: 150 },
    email:     { label: 'Email', type: 'email', required: true, maxLength: 150 },
    phone:     { label: 'Telefon', type: 'text', maxLength: 30 },
    password:  { label: 'Parol', type: 'password', required: true, minLength: 6, maxLength: 100 },
  },
};

const loginSchema = {
  columns: {
    email:    { label: 'Email', type: 'email', required: true, maxLength: 150 },
    password: { label: 'Parol', type: 'password', required: true, maxLength: 100 },
  },
};

const USER_SELECT = `
  SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.status, u.created_at, r.name AS role
  FROM users u JOIN roles r ON r.id = u.role_id`;

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
}

async function register(body) {
  const data = validate(registerSchema, body, 'create');

  const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (exists.rowCount) throw new HttpError(409, 'Bu email bilan foydalanuvchi allaqachon ro\'yxatdan o\'tgan');

  const { rows } = await db.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role_id)
     VALUES ($1, $2, $3, $4, (SELECT id FROM roles WHERE name = 'user'))
     RETURNING id`,
    [data.full_name, data.email, data.phone || null, hashPassword(data.password)]
  );
  const user = (await db.query(`${USER_SELECT} WHERE u.id = $1`, [rows[0].id])).rows[0];
  return { token: issueToken(user), user: publicUser(user) };
}

async function login(body) {
  const data = validate(loginSchema, body, 'create');
  const user = (await db.query(`${USER_SELECT} WHERE u.email = $1`, [data.email])).rows[0];

  if (!user || !verifyPassword(data.password, user.password_hash)) {
    throw new HttpError(401, 'Email yoki parol noto\'g\'ri');
  }
  if (user.status !== 'active') throw new HttpError(403, 'Hisobingiz bloklangan. Admin bilan bog\'laning');

  return { token: issueToken(user), user: publicUser(user) };
}

module.exports = { register, login };
