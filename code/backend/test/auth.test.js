// Xodimlar paneli: username + parol, captcha, qulf, JWT sessiya (token_version), RBAC va ierarxiya
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const h = require('./helpers');
const users = require('../src/modules/users/users.service');
const { seedAdmin } = require('../scripts/seed-admin');
const { connectionConfig } = require('../src/config/db');

const SAME_MESSAGE = 'Username yoki parol noto\'g\'ri';
let admin; // { accessToken, refreshToken } — parol allaqachon almashtirilgan

before(async () => {
  await h.setup();
  admin = await h.readyTokens(h.ADMIN);
});
after(h.teardown);

describe('himoyalangan endpointlar', () => {
  test('panel endpointlari tokensiz -> 401 (yagona xato formati)', async () => {
    const c = h.api();
    const urls = [
      ['get', '/api/auth/me'], ['post', '/api/auth/change-password'], ['get', '/api/admin/meta'],
      ['get', '/api/admin/orders'], ['get', '/api/admin/products'], ['post', '/api/admin/products'],
      ['put', '/api/admin/products/1'], ['delete', '/api/admin/categories/1'], ['patch', '/api/admin/orders/1/status'],
      ['get', '/api/users'], ['post', '/api/users'], ['post', '/api/users/1/reset-password'], ['get', '/api/roles'],
      ['put', '/api/roles/1/accesses'], ['get', '/api/accesses'], ['get', '/api/login-attempts'],
    ];
    for (const [m, url] of urls) {
      const res = await c[m](url);
      assert.equal(res.status, 401, `${m} ${url}`);
      assert.equal(typeof res.body.error.code, 'string');
      assert.equal(typeof res.body.error.message, 'string');
    }
  });

  test('buzilgan yoki boshqa kalit bilan imzolangan token -> 401', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ sub: '1', rt: 'ADMIN', tv: 0 }, 'boshqa-kalit-boshqa-kalit-boshqa-kalit');
    assert.equal((await h.api().get('/api/users').set(h.bearer(forged))).status, 401);
    const none = await h.api().get('/api/users').set(h.bearer(`${admin.accessToken.split('.').slice(0, 2).join('.')}.`));
    assert.equal(none.status, 401);
  });

  test('regenerate-code endpointi yo\'q', async () => {
    assert.equal((await h.api().post('/api/users/1/regenerate-code').set(h.bearer(admin.accessToken))).status, 404);
  });
});

describe('login', () => {
  test('username + to\'g\'ri parol -> tokenlar; username katta-kichik harfga sezgir emas', async () => {
    const res = await h.login({ username: '  ADMIN ', password: h.ADMIN.password });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken && res.body.refreshToken);
    assert.equal(res.body.mustChangePassword, false);
    assert.equal(res.body.user.username, 'admin');
    assert.equal(res.body.user.role.type, 'ADMIN');
    assert.equal(res.body.user.password_hash, undefined);
  });

  test('parol katta-kichik harfga sezgir', async () => {
    const res = await h.login({ username: 'admin', password: h.ADMIN.password.toUpperCase() });
    assert.equal(res.status, 401);
  });

  test('noto\'g\'ri parol va mavjud bo\'lmagan username -> bir xil umumiy xabar', async () => {
    const wrong = await h.login({ username: 'admin', password: 'Notogri123' });
    const noUser = await h.login({ username: 'hech.kim', password: 'Notogri123' });
    assert.equal(wrong.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrong.body.error.message, SAME_MESSAGE);
    assert.equal(noUser.body.error.message, SAME_MESSAGE);
    assert.equal(wrong.body.error.code, noUser.body.error.code);
  });

  test('3 xatodan keyin captcha\'siz -> CAPTCHA_REQUIRED; ishlatilgan captcha qayta qabul qilinmaydi', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'captcha.user', roleName: 'Menejer' });
    const c = h.api();
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await h.login({ username: staff.username, password: 'Notogri123' }, {}, c)).status, 401);
    }
    const blocked = await h.login(staff, {}, c);
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.error.code, 'CAPTCHA_REQUIRED');

    // Boshqa IP'dan ham — username bo'yicha hisoblanadi
    assert.equal((await h.login(staff)).body.error.code, 'CAPTCHA_REQUIRED');

    const captcha = await h.knownCaptcha();
    const ok = await h.login(staff, captcha, c);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));

    const reused = await h.login(staff, captcha, c);
    assert.equal(reused.status, 400);
    assert.equal(reused.body.error.code, 'CAPTCHA_INVALID');

    const wrongAnswer = await h.login(staff, { ...(await h.knownCaptcha('abcde')), captchaAnswer: 'xxxxx' }, c);
    assert.equal(wrongAnswer.body.error.code, 'CAPTCHA_INVALID');
  });

  test('captcha rasmi: GET /api/auth/captcha -> { captchaId, svg }', async () => {
    const res = await h.api().get('/api/auth/captcha');
    assert.equal(res.status, 200);
    assert.match(res.body.captchaId, /^[0-9a-f-]{36}$/);
    assert.match(res.body.svg, /^<svg/);
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  test('5 xatodan keyin akkaunt bloklanadi, to\'g\'ri parol bilan ham kirib bo\'lmaydi', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'lock.user', roleName: 'Menejer' });
    const c = h.api();
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await h.login({ username: staff.username, password: 'Notogri123' }, i >= 3 ? await h.knownCaptcha() : {}, c);
    }
    assert.equal(last.status, 423);
    assert.equal(last.body.error.code, 'ACCOUNT_LOCKED');

    const correct = await h.login(staff, await h.knownCaptcha(), c);
    assert.equal(correct.status, 423);
    assert.ok(correct.body.error.retryAfterSeconds > 0 && correct.body.error.retryAfterSeconds <= 15 * 60);

    // Admin faollashtirsa qulf ochiladi
    const unlock = await h.api().patch(`/api/users/${staff.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: true });
    assert.equal(unlock.status, 200);
    assert.equal(unlock.body.lockedUntil, null);
  });

  test('har bir urinish login_attempts ga yoziladi; jurnal faqat ADMIN uchun', async () => {
    const res = await h.api().get('/api/login-attempts?username=lock.user&success=false').set(h.bearer(admin.accessToken));
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 5);
    assert.ok(res.body.data.some((r) => r.reason === 'LOCKED'));
    assert.ok(res.body.data.every((r) => r.username === 'lock.user'));
  });
});

describe('vaqtinchalik parol va parol siyosati', () => {
  test('must_change_password: login bor, lekin boshqa endpointlar -> 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'yangi.xodim', roleName: 'Direktor' });
    const s = await h.tokenFor(staff);
    assert.equal(s.mustChangePassword, true);
    const t = h.bearer(s.accessToken);
    const c = h.api();

    const me = await c.get('/api/auth/me').set(t);
    assert.equal(me.status, 200);
    assert.equal(me.body.mustChangePassword, true);

    for (const [m, url] of [['get', '/api/admin/products'], ['get', '/api/admin/orders'], ['get', '/api/admin/meta'],
      ['get', '/api/users'], ['get', '/api/roles']]) {
      const res = await c[m](url).set(t);
      assert.equal(res.status, 403, url);
      assert.equal(res.body.error.code, 'PASSWORD_CHANGE_REQUIRED', url);
    }

    const changed = await c.post('/api/auth/change-password').set(t)
      .send({ currentPassword: staff.password, newPassword: 'Mustahkam2026' });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.mustChangePassword, false);
    assert.equal((await c.get('/api/admin/products').set(h.bearer(changed.body.accessToken))).status, 200);
    assert.equal((await c.post('/api/auth/logout').send({ refreshToken: changed.body.refreshToken })).status, 204);
  });

  test('zaif parol -> 400 (o\'zgartirishda ham, yaratishda ham)', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'zaif.parol', roleName: 'Menejer' });
    const s = await h.tokenFor(staff);
    const c = h.api();
    const weak = ['qisqa1', 'faqatharflar', '1234567890', 'zaif.parol', 'Zaif.Parol', `a1${'x'.repeat(71)}`, `ыы1${'ы'.repeat(35)}`];
    for (const newPassword of weak) {
      const res = await c.post('/api/auth/change-password').set(h.bearer(s.accessToken))
        .send({ currentPassword: staff.password, newPassword });
      assert.equal(res.status, 400, newPassword);
      assert.equal(res.body.error.code, 'WEAK_PASSWORD', newPassword);
      assert.ok(res.body.error.message.length > 5);
    }
    // Eski bilan bir xil
    const same = await c.post('/api/auth/change-password').set(h.bearer(s.accessToken))
      .send({ currentPassword: staff.password, newPassword: staff.password });
    assert.equal(same.status, 400);
    // Joriy parol noto'g'ri
    const wrongCurrent = await c.post('/api/auth/change-password').set(h.bearer(s.accessToken))
      .send({ currentPassword: 'Notogri123', newPassword: 'Mustahkam2026' });
    assert.equal(wrongCurrent.status, 400);
    assert.equal(wrongCurrent.body.error.code, 'INVALID_CURRENT_PASSWORD');

    const create = await c.post('/api/users').set(h.bearer(admin.accessToken))
      .send({ fullName: 'Zaif', username: 'zaif2', password: '12345678', roleId: await h.roleIdByName('Menejer') });
    assert.equal(create.status, 400);
    assert.ok(create.body.error.details.password);
  });

  test('parol berilmasa server 12 belgili vaqtinchalik parol generatsiya qiladi (bir marta)', async () => {
    const res = await h.api().post('/api/users').set(h.bearer(admin.accessToken))
      .send({ fullName: 'Generatsiya', username: 'gen.user', roleId: await h.roleIdByName('Menejer') });
    assert.equal(res.status, 201);
    assert.match(res.body.temporaryPassword, /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{12}$/);
    assert.equal(res.headers['cache-control'], 'no-store');
    const s = await h.tokenFor({ username: 'GEN.USER', password: res.body.temporaryPassword });
    assert.equal(s.mustChangePassword, true);
    const list = await h.api().get('/api/users?search=gen.user').set(h.bearer(admin.accessToken));
    assert.equal(list.body.data[0].temporaryPassword, undefined);
    assert.equal(list.body.data[0].password_hash, undefined);
  });

  test('parol o\'zgargandan keyin eski access va refresh tokenlar darhol 401', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'tv.user', roleName: 'Direktor' });
    const ready = await h.readyTokens(staff);       // 1-qurilma
    const other = await h.tokenFor(staff);           // 2-qurilma
    assert.equal((await h.api().get('/api/users').set(h.bearer(other.accessToken))).status, 200);

    const changed = await h.api().post('/api/auth/change-password').set(h.bearer(ready.accessToken))
      .send({ currentPassword: staff.password, newPassword: 'Boshqa2026parol' });
    assert.equal(changed.status, 200);

    for (const s of [ready, other]) {
      const res = await h.api().get('/api/users').set(h.bearer(s.accessToken));
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'TOKEN_REVOKED');
      assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken })).status, 401);
    }
    assert.equal((await h.api().get('/api/users').set(h.bearer(changed.body.accessToken))).status, 200);
    assert.equal((await h.login({ username: staff.username, password: staff.password })).status, 401);
  });
});

describe('RBAC', () => {
  let director;
  let manager;
  let managerTokens;

  before(async () => {
    const d = await h.createStaff(admin.accessToken, { username: 'direktor', roleName: 'Direktor' });
    director = { ...d, tokens: await h.readyTokens(d) };
    manager = await h.createStaff(director.tokens.accessToken, { username: 'menejer', roleName: 'Menejer' });
    managerTokens = await h.readyTokens(manager);
  });

  test('MANAGER access\'siz -> 403; director access bergach QAYTA LOGIN\'SIZ -> 200', async () => {
    const c = h.api();
    const denied = await c.get('/api/admin/products').set(h.bearer(managerTokens.accessToken));
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, 'FORBIDDEN');
    assert.deepEqual(denied.body.error.requiredAccess, ['PRODUCT_VIEW']);

    const groups = (await c.get('/api/accesses').set(h.bearer(director.tokens.accessToken))).body;
    const productView = groups.pages.find((p) => p.code === 'PRODUCT').accesses.find((a) => a.action === 'VIEW');
    const roleId = await h.roleIdByName('Menejer');
    const grant = await c.put(`/api/roles/${roleId}/accesses`).set(h.bearer(director.tokens.accessToken))
      .send({ accessIds: [productView.id] });
    assert.equal(grant.status, 200, JSON.stringify(grant.body));

    assert.equal((await c.get('/api/admin/products').set(h.bearer(managerTokens.accessToken))).status, 200);
    const me = await c.get('/api/auth/me').set(h.bearer(managerTokens.accessToken));
    assert.deepEqual(me.body.accesses, ['PRODUCT_VIEW']);
    assert.equal(me.body.fullAccess, false);

    assert.equal((await c.post('/api/admin/products').set(h.bearer(managerTokens.accessToken)).send({})).status, 403);
    assert.equal((await c.delete('/api/admin/products/1').set(h.bearer(managerTokens.accessToken))).status, 403);
    assert.equal((await c.get('/api/admin/orders').set(h.bearer(managerTokens.accessToken))).status, 403);

    await c.put(`/api/roles/${roleId}/accesses`).set(h.bearer(director.tokens.accessToken)).send({ accessIds: [] });
    assert.equal((await c.get('/api/admin/products').set(h.bearer(managerTokens.accessToken))).status, 403);
  });

  test('status o\'zgartirish (arxivlash) uchun *_ARCHIVE kerak', async () => {
    const c = h.api();
    const groups = (await c.get('/api/accesses').set(h.bearer(admin.accessToken))).body;
    const cat = groups.pages.find((p) => p.code === 'CATEGORY').accesses;
    const id = (a) => cat.find((x) => x.action === a).id;
    const roleId = await h.roleIdByName('Menejer');
    await c.put(`/api/roles/${roleId}/accesses`).set(h.bearer(admin.accessToken)).send({ accessIds: [id('VIEW'), id('UPDATE')] });

    const t = h.bearer(managerTokens.accessToken);
    assert.equal((await c.put('/api/admin/categories/1').set(t).send({ description: 'yangi tavsif' })).status, 200);
    assert.equal((await c.put('/api/admin/categories/1').set(t).send({ status: 'active', description: 'x' })).status, 200);
    const archive = await c.put('/api/admin/categories/1').set(t).send({ status: 'inactive' });
    assert.equal(archive.status, 403);
    assert.deepEqual(archive.body.error.requiredAccess, ['CATEGORY_ARCHIVE']);
    await c.put(`/api/roles/${roleId}/accesses`).set(h.bearer(admin.accessToken)).send({ accessIds: [] });
  });

  test('ADMIN va DIRECTOR access tekshiruvisiz barcha endpointlarga kiradi', async () => {
    const c = h.api();
    for (const tokens of [admin, director.tokens]) {
      const t = h.bearer(tokens.accessToken);
      for (const url of ['/api/admin/meta', '/api/admin/orders', '/api/admin/products', '/api/admin/categories',
        '/api/admin/categories/options', '/api/users', '/api/roles', '/api/accesses']) {
        assert.equal((await c.get(url).set(t)).status, 200, url);
      }
    }
    assert.equal((await c.get('/api/login-attempts').set(h.bearer(director.tokens.accessToken))).status, 403);
  });

  test('MANAGER boshqaruv API\'siga kira olmaydi', async () => {
    const c = h.api();
    const t = h.bearer(managerTokens.accessToken);
    for (const [m, url] of [['get', '/api/users'], ['post', '/api/users'], ['get', '/api/roles'],
      ['get', '/api/accesses'], ['get', '/api/login-attempts'], ['post', `/api/users/${director.id}/reset-password`]]) {
      assert.equal((await c[m](url).set(t)).status, 403, url);
    }
  });

  test('DIRECTOR ADMIN/DIRECTOR yarata olmaydi, o\'zgartira olmaydi, parolini tiklay olmaydi -> 403', async () => {
    const c = h.api();
    const t = h.bearer(director.tokens.accessToken);
    for (const roleName of ['admin', 'Direktor']) {
      const res = await c.post('/api/users').set(t)
        .send({ fullName: 'Yangi', username: `yangi.${roleName.toLowerCase()}`, password: 'Vaqtin4lik', roleId: await h.roleIdByName(roleName) });
      assert.equal(res.status, 403, roleName);
    }
    const adminId = (await c.get('/api/auth/me').set(h.bearer(admin.accessToken))).body.id;
    const otherDirector = await h.createStaff(admin.accessToken, { username: 'direktor2', roleName: 'Direktor' });
    assert.equal((await c.patch(`/api/users/${adminId}`).set(t).send({ fullName: 'Buzildi' })).status, 403);
    assert.equal((await c.patch(`/api/users/${adminId}/status`).set(t).send({ isActive: false })).status, 403);
    for (const id of [adminId, otherDirector.id]) {
      const reset = await c.post(`/api/users/${id}/reset-password`).set(t);
      assert.equal(reset.status, 403);
      assert.equal(reset.body.temporaryPassword, undefined);
    }
    // Menejerni yuqori role'ga ko'tara olmaydi
    assert.equal((await c.patch(`/api/users/${manager.id}`).set(t).send({ roleId: await h.roleIdByName('Direktor') })).status, 403);
    assert.equal((await c.post('/api/roles').set(t).send({ name: 'Bosh', type: 'ADMIN' })).status, 403);
    assert.equal((await c.put(`/api/roles/${await h.roleIdByName('admin')}`).set(t).send({ name: 'Boshqa nom' })).status, 403);
    assert.equal((await c.put(`/api/roles/${await h.roleIdByName('Menejer')}`).set(t).send({ type: 'DIRECTOR' })).status, 403);
    assert.equal((await c.post('/api/roles').set(t).send({ name: 'Omborchi', type: 'MANAGER' })).status, 201);
  });

  test('o\'zini bloklab / o\'z role\'ini o\'zgartirib / o\'z parolini tiklab bo\'lmaydi; oxirgi faol ADMIN himoyalangan', async () => {
    const c = h.api();
    const me = (await c.get('/api/auth/me').set(h.bearer(admin.accessToken))).body;
    assert.equal((await c.patch(`/api/users/${me.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: false })).status, 403);
    assert.equal((await c.patch(`/api/users/${me.id}`).set(h.bearer(admin.accessToken)).send({ roleId: await h.roleIdByName('Menejer') })).status, 403);
    assert.equal((await c.put(`/api/roles/${me.role.id}`).set(h.bearer(admin.accessToken)).send({ type: 'MANAGER' })).status, 403);
    assert.equal((await c.post(`/api/users/${me.id}/reset-password`).set(h.bearer(admin.accessToken))).status, 403);

    const phantomAdmin = { id: 999999, roleType: 'ADMIN', roleId: -1 };
    await assert.rejects(users.setStatus(phantomAdmin, me.id, { isActive: false }), (e) => e.code === 'LAST_ADMIN');
    await assert.rejects(
      users.update(phantomAdmin, me.id, { roleId: await h.roleIdByName('Menejer') }),
      (e) => e.code === 'LAST_ADMIN'
    );
  });

  test('validatsiya -> 400', async () => {
    const c = h.api();
    const t = h.bearer(admin.accessToken);
    const res = await c.post('/api/users').set(t).send({ fullName: 'A', username: 'yomon-username!', roleId: 'x' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.fullName && res.body.error.details.username && res.body.error.details.roleId);
    assert.equal((await c.post('/api/users').set(t).send({ fullName: 'Uzun', username: 'a'.repeat(33), roleId: 1 })).status, 400);
    assert.equal((await c.put('/api/roles/1/accesses').set(t).send({ accessIds: ['1'] })).status, 400);
    assert.equal((await c.patch(`/api/users/${manager.id}/status`).set(t).send({ isActive: 'no' })).status, 400);
    const dup = await c.post('/api/users').set(t)
      .send({ fullName: 'Takror', username: 'MENEJER', password: 'Vaqtin4lik', roleId: await h.roleIdByName('Menejer') });
    assert.equal(dup.status, 409);
  });
});

describe('sessiya', () => {
  test('parol tiklanganda eski parol, access va refresh tokenlar ishlamaydi; yangi vaqtinchalik parol bilan kirish', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'reset.user', roleName: 'Menejer' });
    const old = await h.readyTokens(staff);
    const res = await h.api().post(`/api/users/${staff.id}/reset-password`).set(h.bearer(admin.accessToken));
    assert.equal(res.status, 200);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.match(res.body.temporaryPassword, /^[a-zA-Z0-9]{12}$/);
    assert.equal(res.body.user.mustChangePassword, true);

    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(old.accessToken))).status, 401);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: old.refreshToken })).status, 401);
    assert.equal((await h.login(staff)).status, 401);
    const fresh = await h.login({ username: staff.username, password: res.body.temporaryPassword });
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.mustChangePassword, true);
  });

  test('refresh rotatsiyasi; eski refresh qayta ishlatilsa barcha sessiyalar bekor bo\'ladi', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'rotate.user', roleName: 'Menejer' });
    const first = await h.readyTokens(staff);
    const other = await h.tokenFor(staff);

    const r1 = await h.api().post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    assert.equal(r1.status, 200);
    assert.notEqual(r1.body.refreshToken, first.refreshToken);
    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(r1.body.accessToken))).status, 200);

    const reuse = await h.api().post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    assert.equal(reuse.status, 401);
    assert.equal(reuse.body.error.code, 'REFRESH_REUSED');
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: r1.body.refreshToken })).status, 401);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: other.refreshToken })).status, 401);
  });

  test('logout refresh tokenni bekor qiladi', async () => {
    const s = await h.tokenFor(h.ADMIN);
    assert.equal((await h.api().post('/api/auth/logout').send({ refreshToken: s.refreshToken })).status, 204);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken })).status, 401);
  });

  test('bloklangan userning amaldagi access tokeni ham darhol 401', async () => {
    const staff = await h.createStaff(admin.accessToken, { username: 'block.user', roleName: 'Menejer' });
    const s = await h.readyTokens(staff);
    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(s.accessToken))).status, 200);

    const block = await h.api().patch(`/api/users/${staff.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: false });
    assert.equal(block.status, 200);
    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(s.accessToken))).status, 401);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken })).status, 401);
    const relogin = await h.login(staff);
    assert.equal(relogin.status, 401);
    assert.equal(relogin.body.error.message, SAME_MESSAGE);
  });

  test('eski email/parolli akkauntlar kira olmaydi', async () => {
    assert.equal((await h.login({ username: 'admin@qurilish.uz', password: 'admin123' })).status, 401);
  });
});

describe('seed-admin', () => {
  test('flagsiz — mavjud adminni o\'zgartirmaydi; --reset — parolni almashtiradi va sessiyalarni yopadi', async () => {
    const client = new Client(connectionConfig());
    await client.connect();
    try {
      const before = await h.tokenFor(h.ADMIN);
      assert.equal(await seedAdmin(client, { log: () => {} }), null);
      assert.equal((await h.login(h.ADMIN)).status, 200);

      const prev = process.env.ADMIN_INITIAL_PASSWORD;
      process.env.ADMIN_INITIAL_PASSWORD = 'Tiklangan2026';
      try {
        const res = await seedAdmin(client, { reset: true, log: () => {} });
        assert.equal(res.reset, true);
      } finally {
        process.env.ADMIN_INITIAL_PASSWORD = prev;
      }

      assert.equal((await h.api().get('/api/auth/me').set(h.bearer(before.accessToken))).status, 401);
      assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: before.refreshToken })).status, 401);
      assert.equal((await h.login(h.ADMIN)).status, 401);
      // Oldingi testlardagi xatolar tufayli 'admin' uchun captcha talab qilinadi — bu ham to'g'ri xatti-harakat
      const fresh = await h.login({ username: 'admin', password: 'Tiklangan2026' }, await h.knownCaptcha());
      assert.equal(fresh.status, 200);
      assert.equal(fresh.body.mustChangePassword, true);

      // --only-with-env: parol berilmasa hech narsa qilmaydi
      delete process.env.ADMIN_INITIAL_PASSWORD;
      try {
        assert.equal(await seedAdmin(client, { reset: true, onlyWithEnv: true, log: () => {} }), null);
      } finally {
        process.env.ADMIN_INITIAL_PASSWORD = prev;
      }
      assert.equal((await h.login({ username: 'admin', password: 'Tiklangan2026' }, await h.knownCaptcha())).status, 200);
    } finally {
      await client.end();
    }
  });
});
