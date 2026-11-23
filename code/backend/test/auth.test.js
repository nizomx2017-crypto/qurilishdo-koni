// Xodimlar paneli: login + kod, captcha, qulf, JWT sessiya, RBAC va ierarxiya
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const users = require('../src/modules/users/users.service');

const SAME_MESSAGE = 'Login yoki kod noto\'g\'ri';
let admin; // { accessToken, refreshToken }

before(async () => {
  await h.setup();
  admin = await h.tokenFor(h.ADMIN);
});
after(h.teardown);

describe('himoyalangan endpointlar', () => {
  test('panel endpointlari tokensiz -> 401 (yagona xato formati)', async () => {
    const c = h.api();
    const urls = [
      ['get', '/api/auth/me'], ['get', '/api/admin/meta'], ['get', '/api/admin/orders'],
      ['get', '/api/admin/products'], ['post', '/api/admin/products'], ['put', '/api/admin/products/1'],
      ['delete', '/api/admin/categories/1'], ['patch', '/api/admin/orders/1/status'],
      ['get', '/api/users'], ['post', '/api/users'], ['get', '/api/roles'], ['put', '/api/roles/1/accesses'],
      ['get', '/api/accesses'], ['get', '/api/login-attempts'],
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
    const forged = jwt.sign({ sub: '1', rt: 'ADMIN' }, 'boshqa-kalit-boshqa-kalit-boshqa-kalit');
    const res = await h.api().get('/api/users').set(h.bearer(forged));
    assert.equal(res.status, 401);
    const none = await h.api().get('/api/users').set(h.bearer(`${admin.accessToken.split('.').slice(0, 2).join('.')}.`));
    assert.equal(none.status, 401);
  });
});

describe('login', () => {
  test('to\'g\'ri login + kod -> tokenlar; kod normalizatsiyasi', async () => {
    const res = await h.login({ login: 'ADMIN', code: 'abcd 2345' });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken && res.body.refreshToken);
    assert.equal(res.body.user.role.type, 'ADMIN');
    assert.equal(res.body.user.fullAccess, true);
    assert.equal(res.body.user.code_hash, undefined);
  });

  test('noto\'g\'ri kod va mavjud bo\'lmagan login -> bir xil umumiy xabar', async () => {
    const wrong = await h.login({ login: 'admin', code: 'ZZZZ-ZZZZ' });
    const noUser = await h.login({ login: 'hech-kim', code: 'ZZZZ-ZZZZ' });
    assert.equal(wrong.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrong.body.error.message, SAME_MESSAGE);
    assert.equal(noUser.body.error.message, SAME_MESSAGE);
    assert.equal(wrong.body.error.code, noUser.body.error.code);
  });

  test('3 xatodan keyin captcha\'siz -> CAPTCHA_REQUIRED; ishlatilgan captcha qayta qabul qilinmaydi', async () => {
    const staff = await h.createStaff(admin.accessToken, { login: 'captcha.user', roleName: 'Menejer' });
    const c = h.api();
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await h.login({ login: staff.login, code: 'ZZZZ-ZZZZ' }, {}, c)).status, 401);
    }
    const blocked = await h.login({ login: staff.login, code: staff.code }, {}, c);
    assert.equal(blocked.status, 400);
    assert.equal(blocked.body.error.code, 'CAPTCHA_REQUIRED');

    // Boshqa IP'dan ham — login bo'yicha hisoblanadi
    const otherIp = await h.login({ login: staff.login, code: staff.code });
    assert.equal(otherIp.body.error.code, 'CAPTCHA_REQUIRED');

    const captcha = await h.knownCaptcha();
    const ok = await h.login({ login: staff.login, code: staff.code }, captcha, c);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));

    const reused = await h.login({ login: staff.login, code: staff.code }, captcha, c);
    assert.equal(reused.status, 400);
    assert.equal(reused.body.error.code, 'CAPTCHA_INVALID');

    const wrongAnswer = await h.login({ login: staff.login, code: staff.code },
      { ...(await h.knownCaptcha('abcde')), captchaAnswer: 'xxxxx' }, c);
    assert.equal(wrongAnswer.body.error.code, 'CAPTCHA_INVALID');
  });

  test('captcha rasmi: GET /api/auth/captcha -> { captchaId, svg }', async () => {
    const res = await h.api().get('/api/auth/captcha');
    assert.equal(res.status, 200);
    assert.match(res.body.captchaId, /^[0-9a-f-]{36}$/);
    assert.match(res.body.svg, /^<svg/);
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  test('5 xatodan keyin akkaunt bloklanadi, to\'g\'ri kod bilan ham kirib bo\'lmaydi', async () => {
    const staff = await h.createStaff(admin.accessToken, { login: 'lock.user', roleName: 'Menejer' });
    const c = h.api();
    let last;
    for (let i = 0; i < 5; i += 1) {
      last = await h.login({ login: staff.login, code: 'ZZZZ-ZZZZ' }, i >= 3 ? await h.knownCaptcha() : {}, c);
    }
    assert.equal(last.status, 423);
    assert.equal(last.body.error.code, 'ACCOUNT_LOCKED');

    const correct = await h.login({ login: staff.login, code: staff.code }, await h.knownCaptcha(), c);
    assert.equal(correct.status, 423);
    assert.ok(correct.body.error.retryAfterSeconds > 0 && correct.body.error.retryAfterSeconds <= 15 * 60);

    // Admin faollashtirsa qulf ochiladi
    const unlock = await h.api().patch(`/api/users/${staff.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: true });
    assert.equal(unlock.status, 200);
    assert.equal(unlock.body.lockedUntil, null);
  });

  test('har bir urinish login_attempts ga yoziladi; jurnal faqat ADMIN uchun', async () => {
    const res = await h.api().get('/api/login-attempts?login=lock.user&success=false').set(h.bearer(admin.accessToken));
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 5);
    assert.ok(res.body.data.some((r) => r.reason === 'LOCKED'));
  });
});

describe('RBAC', () => {
  let director;
  let manager;
  let managerTokens;

  before(async () => {
    const d = await h.createStaff(admin.accessToken, { login: 'direktor', roleName: 'Direktor' });
    director = { ...d, tokens: await h.tokenFor(d) };
    manager = await h.createStaff(director.tokens.accessToken, { login: 'menejer', roleName: 'Menejer' });
    managerTokens = await h.tokenFor(manager);
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

    const allowed = await c.get('/api/admin/products').set(h.bearer(managerTokens.accessToken));
    assert.equal(allowed.status, 200);
    const me = await c.get('/api/auth/me').set(h.bearer(managerTokens.accessToken));
    assert.deepEqual(me.body.accesses, ['PRODUCT_VIEW']);
    assert.equal(me.body.fullAccess, false);

    // VIEW bor, CREATE/DELETE yo'q
    assert.equal((await c.post('/api/admin/products').set(h.bearer(managerTokens.accessToken)).send({})).status, 403);
    assert.equal((await c.delete('/api/admin/products/1').set(h.bearer(managerTokens.accessToken))).status, 403);
    assert.equal((await c.get('/api/admin/orders').set(h.bearer(managerTokens.accessToken))).status, 403);

    // Olib tashlansa — darhol yopiladi
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
      ['get', '/api/accesses'], ['get', '/api/login-attempts']]) {
      assert.equal((await c[m](url).set(t)).status, 403, url);
    }
  });

  test('DIRECTOR ADMIN/DIRECTOR yarata olmaydi va ularni o\'zgartira olmaydi -> 403', async () => {
    const c = h.api();
    const t = h.bearer(director.tokens.accessToken);
    for (const roleName of ['admin', 'Direktor']) {
      const res = await c.post('/api/users').set(t)
        .send({ fullName: 'Yangi', login: `yangi.${roleName.toLowerCase()}`, roleId: await h.roleIdByName(roleName) });
      assert.equal(res.status, 403, roleName);
    }
    const adminId = (await c.get('/api/auth/me').set(h.bearer(admin.accessToken))).body.id;
    assert.equal((await c.patch(`/api/users/${adminId}`).set(t).send({ fullName: 'Buzildi' })).status, 403);
    assert.equal((await c.patch(`/api/users/${adminId}/status`).set(t).send({ isActive: false })).status, 403);
    assert.equal((await c.post(`/api/users/${adminId}/regenerate-code`).set(t)).status, 403);
    // Menejerni yuqori role'ga ko'tara olmaydi
    assert.equal((await c.patch(`/api/users/${manager.id}`).set(t).send({ roleId: await h.roleIdByName('Direktor') })).status, 403);
    // ADMIN/DIRECTOR turidagi role yaratish/o'zgartirish
    assert.equal((await c.post('/api/roles').set(t).send({ name: 'Bosh', type: 'ADMIN' })).status, 403);
    assert.equal((await c.put(`/api/roles/${await h.roleIdByName('admin')}`).set(t).send({ name: 'Boshqa nom' })).status, 403);
    assert.equal((await c.put(`/api/roles/${await h.roleIdByName('Menejer')}`).set(t).send({ type: 'DIRECTOR' })).status, 403);
    // MANAGER role yaratishi mumkin
    assert.equal((await c.post('/api/roles').set(t).send({ name: 'Omborchi', type: 'MANAGER' })).status, 201);
  });

  test('o\'zini bloklab / o\'z role\'ini o\'zgartirib bo\'lmaydi; oxirgi faol ADMIN himoyalangan', async () => {
    const c = h.api();
    const me = (await c.get('/api/auth/me').set(h.bearer(admin.accessToken))).body;
    const self = await c.patch(`/api/users/${me.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: false });
    assert.equal(self.status, 403);
    const selfRole = await c.patch(`/api/users/${me.id}`).set(h.bearer(admin.accessToken)).send({ roleId: await h.roleIdByName('Menejer') });
    assert.equal(selfRole.status, 403);
    const ownRoleType = await c.put(`/api/roles/${me.role.id}`).set(h.bearer(admin.accessToken)).send({ type: 'MANAGER' });
    assert.equal(ownRoleType.status, 403);

    // Service qatlami: boshqa admin nomidan ham oxirgi faol adminni bloklab bo'lmaydi
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
    const res = await c.post('/api/users').set(t).send({ fullName: 'A', login: 'yomon login!', roleId: 'x' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.details.fullName && res.body.error.details.login && res.body.error.details.roleId);
    assert.equal((await c.put('/api/roles/1/accesses').set(t).send({ accessIds: ['1'] })).status, 400);
    assert.equal((await c.patch(`/api/users/${manager.id}/status`).set(t).send({ isActive: 'no' })).status, 400);
    const dup = await c.post('/api/users').set(t).send({ fullName: 'Takror', login: 'MENEJER', roleId: await h.roleIdByName('Menejer') });
    assert.equal(dup.status, 409);
  });
});

describe('sessiya', () => {
  test('kod yangilangandan keyin eski kod va eski refresh tokenlar ishlamaydi', async () => {
    const staff = await h.createStaff(admin.accessToken, { login: 'regen.user', roleName: 'Menejer' });
    const old = await h.tokenFor(staff);
    const res = await h.api().post(`/api/users/${staff.id}/regenerate-code`).set(h.bearer(admin.accessToken));
    assert.equal(res.status, 200);
    assert.match(res.body.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.notEqual(res.body.code, staff.code);

    assert.equal((await h.login({ login: staff.login, code: staff.code })).status, 401);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: old.refreshToken })).status, 401);
    assert.equal((await h.login({ login: staff.login, code: res.body.code })).status, 200);
  });

  test('refresh rotatsiyasi; eski refresh qayta ishlatilsa barcha sessiyalar bekor bo\'ladi', async () => {
    const staff = await h.createStaff(admin.accessToken, { login: 'rotate.user', roleName: 'Menejer' });
    const first = await h.tokenFor(staff);
    const other = await h.tokenFor(staff); // ikkinchi qurilma

    const r1 = await h.api().post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    assert.equal(r1.status, 200);
    assert.ok(r1.body.accessToken && r1.body.refreshToken);
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
    const staff = await h.createStaff(admin.accessToken, { login: 'block.user', roleName: 'Menejer' });
    const s = await h.tokenFor(staff);
    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(s.accessToken))).status, 200);

    const block = await h.api().patch(`/api/users/${staff.id}/status`).set(h.bearer(admin.accessToken)).send({ isActive: false });
    assert.equal(block.status, 200);
    assert.equal((await h.api().get('/api/auth/me').set(h.bearer(s.accessToken))).status, 401);
    assert.equal((await h.api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken })).status, 401);
    const relogin = await h.login({ login: staff.login, code: staff.code });
    assert.equal(relogin.status, 401);
    assert.equal(relogin.body.error.message, SAME_MESSAGE);
  });

  test('eski email/parolli akkauntlar kira olmaydi', async () => {
    const res = await h.login({ login: 'admin@qurilish.uz', code: 'admin123' });
    assert.equal(res.status, 401);
  });
});
