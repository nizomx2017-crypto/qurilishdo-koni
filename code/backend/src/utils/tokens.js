/**
 * Tokenlar:
 *  - access  — JWT (HS256), 15 daqiqa, payload { sub: userId, rt: roleType, tv: tokenVersion }.
 *              Access'lar tokenga yozilmaydi: ular har so'rovda bazadan olinadi.
 *              tv bazadagi users.token_version bilan solishtiriladi: parol o'zgarsa/tiklansa
 *              versiya oshadi va eski access tokenlar darhol ishlamay qoladi.
 *  - refresh — 48 bayt tasodifiy qator. Bazada faqat sha256 hash saqlanadi, 7 kun.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwtAccessSecret } = require('../config/env');

const ACCESS_TTL = '15m';
const REFRESH_TTL_DAYS = 7;

function signAccessToken(user) {
  return jwt.sign({ sub: String(user.id), rt: user.roleType, tv: user.tokenVersion }, jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtAccessSecret, { algorithms: ['HS256'] });
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, sha256, REFRESH_TTL_DAYS };
