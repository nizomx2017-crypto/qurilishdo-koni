// Ochiq qism (mijoz): katalog va akkauntsiz buyurtma
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

const PUBLIC_FIELDS = ['id', 'name', 'category_id', 'category_id__label', 'sku', 'unit', 'price',
  'stock_quantity', 'image_url', 'description'];

before(h.setup);
after(h.teardown);

test('ochiq endpointlar tokensiz 200 va faqat mijozga kerakli maydonlar', async () => {
  const c = h.api();
  assert.equal((await c.get('/api/health')).status, 200);

  const cats = await c.get('/api/categories');
  assert.equal(cats.status, 200);
  assert.ok(cats.body.length > 0);

  const list = await c.get('/api/products?limit=50');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);
  list.body.data.forEach((p) => assert.deepEqual(Object.keys(p).sort(), [...PUBLIC_FIELDS].sort()));

  const one = await c.get(`/api/products/${list.body.data[0].id}`);
  assert.equal(one.status, 200);
  assert.deepEqual(Object.keys(one.body).sort(), [...PUBLIC_FIELDS].sort());
  assert.equal(one.body.status, undefined);
});

test('eski mijoz endpointlari yo\'q: ro\'yxatdan o\'tish va savatcha', async () => {
  const c = h.api();
  assert.equal((await c.post('/api/auth/register').send({})).status, 404);
  assert.equal((await c.get('/api/cart')).status, 404);
});

test('buyurtma: captcha majburiy, narx serverda hisoblanadi, qoldiq kamayadi, captcha bir martalik', async () => {
  const c = h.api();
  const product = (await c.get('/api/products?limit=50')).body.data.find((p) => p.stock_quantity >= 5);
  const order = {
    customer_name: 'Ali Valiyev',
    phone: '+998 90 111 22 33',
    address: 'Toshkent, Yunusobod 4-mavze',
    items: [{ product_id: product.id, quantity: 2, price: 1 }, { product_id: product.id, quantity: 1 }],
  };

  const noCaptcha = await c.post('/api/orders').send(order);
  assert.equal(noCaptcha.status, 400);
  assert.equal(noCaptcha.body.error.code, 'CAPTCHA_REQUIRED');

  const bad = await c.post('/api/orders').send({ ...order, ...(await h.knownCaptcha('abcde')), captchaAnswer: 'zzzzz' });
  assert.equal(bad.body.error.code, 'CAPTCHA_INVALID');

  const captcha = await h.knownCaptcha('AbCdE');
  const ok = await c.post('/api/orders').send({ ...order, ...captcha, captchaAnswer: 'abcde' });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  assert.equal(ok.body.items.length, 1);
  assert.equal(ok.body.items[0].quantity, 3);
  assert.equal(ok.body.total_amount, product.price * 3);

  const after = await c.get(`/api/products/${product.id}`);
  assert.equal(after.body.stock_quantity, product.stock_quantity - 3);

  const reused = await c.post('/api/orders').send({ ...order, ...captcha, captchaAnswer: 'abcde' });
  assert.equal(reused.body.error.code, 'CAPTCHA_INVALID');
});

test('buyurtma: noto\'g\'ri maydonlar captcha\'ni yoqmaydi; qoldiqdan ko\'p -> 409', async () => {
  const c = h.api();
  const product = (await c.get('/api/products?limit=50')).body.data.find((p) => p.stock_quantity > 0);
  const captcha = await h.knownCaptcha();

  const invalid = await c.post('/api/orders').send({ customer_name: 'A', phone: 'abc', address: '', items: [], ...captcha });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  assert.ok(invalid.body.error.details.phone);

  const tooMany = await c.post('/api/orders').send({
    customer_name: 'Ali', phone: '+998901112233', address: 'Toshkent shahri',
    items: [{ product_id: product.id, quantity: product.stock_quantity + 1 }], ...captcha,
  });
  assert.equal(tooMany.status, 409);
  assert.equal(tooMany.body.error.code, 'OUT_OF_STOCK');
});
