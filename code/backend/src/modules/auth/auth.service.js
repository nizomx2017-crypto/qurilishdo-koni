/**
 * AUTH — xodimlar paneliga kirish (login + kod). Mijozlar uchun akkaunt yo'q.
 *
 * Login xavfsizligi:
 *  - user topilmasa ham bcrypt "dummy hash" bilan solishtiriladi (vaqtga qarab login borligini bilib bo'lmaydi);
 *  - xato xabari doim bir xil: "Login yoki kod noto'g'ri" (nofaol akkaunt uchun ham);
 *  - 5 ta ketma-ket noto'g'ri kod -> 15 daqiqaga qulf (qolgan vaqt qaytariladi);
 *  - shu login YOKI IP bo'yicha 15 daqiqada >=3 xato -> captcha majburiy;
 *  - har bir urinish login_attempts ga yoziladi.
 *
 * Sessiya: access JWT (15 daqiqa) + refresh (7 kun, bazada sha256). Har refresh'da rotatsiya.
 * Bekor qilingan refresh qayta kelsa — o'g'irlik belgisi: userning barcha sessiyalari bekor qilinadi.
 */
const db = require('../../config/db');
const HttpError = require('../../utils/httpError');
const { verifyCode } = require('../../utils/code');
const { verifyCaptcha } = require('../../utils/captcha');
const { signAccessToken, generateRefreshToken, sha256, REFRESH_TTL_DAYS } = require('../../utils/tokens');
const { loadActiveStaff, isBlocked, toStaff, STAFF_SELECT } = require('../../api/middleware/authenticate');
const { hasFullAccess } = require('../../api/middleware/requireAccess');

const CAPTCHA_AFTER_FAILS = 3;
const LOCK_AFTER_FAILS = 5;
const LOCK_MINUTES = 15;
const INVALID_MESSAGE = 'Login yoki kod noto\'g\'ri';

const invalidCredentials = () => new HttpError(401, INVALID_MESSAGE, undefined, 'INVALID_CREDENTIALS');

function lockedError(lockedUntil) {
  const seconds = Math.max(1, Math.ceil((new Date(lockedUntil) - Date.now()) / 1000));
  return new HttpError(423, `Akkaunt vaqtincha bloklangan. ${Math.ceil(seconds / 60)} daqiqadan keyin urinib ko'ring`,
    undefined, 'ACCOUNT_LOCKED', { retryAfterSeconds: seconds });
}

function readLoginBody(body) {
  const b = body && typeof body === 'object' ? body : {};
  const login = typeof b.login === 'string' ? b.login.trim() : '';
  const code = typeof b.code === 'string' ? b.code : '';
  const errors = {};
  if (!login || login.length > 50) errors.login = 'Login kiriting';
  if (!code || code.length > 64) errors.code = 'Kod kiriting';
  if (Object.keys(errors).length) throw new HttpError(400, 'Login va kodni kiriting', errors);
  return {
    login,
    code,
    captchaId: typeof b.captchaId === 'string' ? b.captchaId : null,
    captchaAnswer: typeof b.captchaAnswer === 'string' ? b.captchaAnswer : null,
  };
}

async function recordAttempt(login, ip, success, reason) {
  await db.query(
    'INSERT INTO login_attempts (login, ip, success, reason) VALUES ($1, $2, $3, $4)',
    [String(login).slice(0, 100), ip ? String(ip).slice(0, 64) : null, success, reason]
  );
}

async function captchaRequired(login, ip) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM login_attempts
     WHERE success = FALSE AND created_at > NOW() - INTERVAL '15 minutes'
       AND (LOWER(login) = LOWER($1) OR ip = $2)`,
    [login.slice(0, 100), ip ? String(ip).slice(0, 64) : null]
  );
  return rows[0].n >= CAPTCHA_AFTER_FAILS;
}

async function createSession(client, userId, meta = {}) {
  const refreshToken = generateRefreshToken();
  const { rows } = await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval, $4, $5) RETURNING id`,
    [userId, sha256(refreshToken), String(REFRESH_TTL_DAYS),
      meta.userAgent ? String(meta.userAgent).slice(0, 300) : null,
      meta.ip ? String(meta.ip).slice(0, 64) : null]
  );
  return { id: rows[0].id, refreshToken };
}

async function revokeAllSessions(userId, client = db) {
  await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

/** GET /api/auth/me javobi */
async function me(userId) {
  const user = await loadActiveStaff(userId);
  if (!user) throw new HttpError(401, 'Foydalanuvchi topilmadi yoki bloklangan');
  const fullAccess = hasFullAccess(user);
  const { rows } = fullAccess
    ? await db.query('SELECT code FROM accesses ORDER BY id')
    : await db.query(
      `SELECT a.code FROM role_accesses ra JOIN accesses a ON a.id = ra.access_id
       WHERE ra.role_id = $1 ORDER BY a.id`,
      [user.roleId]
    );
  return {
    id: user.id,
    fullName: user.fullName,
    login: user.login,
    role: { id: user.roleId, name: user.roleName, type: user.roleType },
    fullAccess,
    accesses: rows.map((r) => r.code),
  };
}

async function login(body, meta = {}) {
  const data = readLoginBody(body);
  const { ip } = meta;

  if (await captchaRequired(data.login, ip)) {
    if (!data.captchaId || !data.captchaAnswer) {
      await recordAttempt(data.login, ip, false, 'CAPTCHA_REQUIRED');
      throw new HttpError(400, 'Rasmdagi belgilarni kiriting', undefined, 'CAPTCHA_REQUIRED');
    }
    if (!(await verifyCaptcha(data.captchaId, data.captchaAnswer))) {
      await recordAttempt(data.login, ip, false, 'CAPTCHA_INVALID');
      throw new HttpError(400, 'Rasmdagi belgilar noto\'g\'ri. Yangi rasm bilan qayta urinib ko\'ring',
        undefined, 'CAPTCHA_INVALID');
    }
  }

  const { rows } = await db.query(
    `${STAFF_SELECT.replace('SELECT', 'SELECT u.code_hash, u.failed_attempts,')}
     WHERE LOWER(u.login) = LOWER($1)`,
    [data.login]
  );
  const row = rows[0];
  // Har doim bcrypt — user bo'lmasa ham (dummy hash bilan)
  const codeOk = await verifyCode(data.code, row && row.code_hash);

  if (!row) {
    await recordAttempt(data.login, ip, false, 'NO_USER');
    throw invalidCredentials();
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    await recordAttempt(data.login, ip, false, 'LOCKED');
    throw lockedError(row.locked_until);
  }
  if (!row.is_active) {
    await recordAttempt(data.login, ip, false, 'INACTIVE');
    throw invalidCredentials();
  }
  if (!codeOk) {
    const upd = await db.query(
      `UPDATE users SET
         failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END,
         locked_until    = CASE WHEN failed_attempts + 1 >= $2
                                THEN NOW() + ($3 || ' minutes')::interval ELSE locked_until END
       WHERE id = $1 RETURNING locked_until`,
      [row.id, LOCK_AFTER_FAILS, String(LOCK_MINUTES)]
    );
    await recordAttempt(data.login, ip, false, 'WRONG_CODE');
    const lockedUntil = upd.rows[0].locked_until;
    if (lockedUntil && new Date(lockedUntil) > new Date()) throw lockedError(lockedUntil);
    throw invalidCredentials();
  }

  await db.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [row.id]);
  await recordAttempt(row.login, ip, true, 'SUCCESS');

  const staff = toStaff(row);
  const session = await createSession(db, staff.id, meta);
  return { accessToken: signAccessToken(staff), refreshToken: session.refreshToken, user: await me(staff.id) };
}

async function refresh(body, meta = {}) {
  const token = body && typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (token.length < 20 || token.length > 200) {
    throw new HttpError(401, 'Sessiya topilmadi. Qaytadan kiring', undefined, 'REFRESH_INVALID');
  }

  // Tranzaksiya ichida throw qilsak bekor qilish (revoke) ham ROLLBACK bo'lib ketadi,
  // shuning uchun xatoni natija sifatida qaytarib, tashqarida throw qilamiz.
  const result = await db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, user_id, revoked_at, expires_at > NOW() AS fresh
       FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [sha256(token)]
    );
    const rt = rows[0];
    if (!rt) return { error: 'REFRESH_INVALID' };
    if (rt.revoked_at) {
      await revokeAllSessions(rt.user_id, client);
      return { error: 'REFRESH_REUSED' };
    }
    if (!rt.fresh) return { error: 'REFRESH_EXPIRED' };

    const { rows: users } = await client.query(`${STAFF_SELECT} WHERE u.id = $1 AND u.login IS NOT NULL`, [rt.user_id]);
    if (!users[0] || isBlocked(users[0])) {
      await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [rt.id]);
      return { error: 'REFRESH_INVALID' };
    }

    const staff = toStaff(users[0]);
    const next = await createSession(client, staff.id, meta);
    await client.query('UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = $2 WHERE id = $1', [rt.id, next.id]);
    return { accessToken: signAccessToken(staff), refreshToken: next.refreshToken };
  });

  if (result.error) {
    const message = result.error === 'REFRESH_REUSED'
      ? 'Xavfsizlik uchun barcha sessiyalar yopildi. Qaytadan kiring'
      : 'Sessiya tugadi. Qaytadan kiring';
    throw new HttpError(401, message, undefined, result.error);
  }
  return result;
}

async function logout(body) {
  const token = body && typeof body.refreshToken === 'string' ? body.refreshToken : '';
  if (token && token.length <= 200) {
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [sha256(token)]);
  }
}

module.exports = { login, refresh, logout, me, revokeAllSessions };
