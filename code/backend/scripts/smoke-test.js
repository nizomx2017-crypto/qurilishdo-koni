/**
 * Asosiy oqimni tekshirish (smoke test):  npm run test:smoke
 * Ishlab turgan API'ga so'rov yuboradi (standart: http://localhost:5000/api, API_URL bilan o'zgartiring).
 * Seed'dagi admin (admin@qurilish.uz / admin123) bo'lishi kerak.
 *
 * Oqim: katalog -> qidiruv -> ro'yxatdan o'tish -> savatcha -> buyurtma (qoldiq kamayadi)
 *       -> buyurtmalarim -> ruxsat tekshiruvi -> admin CRUD -> admin buyurtmani bekor qiladi (qoldiq qaytadi).
 * Test o'zi yaratgan mahsulot/kategoriyani oxirida o'chiradi.
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let passed = 0;

function check(cond, text) {
  if (!cond) throw new Error(`❌ ${text}`);
  passed += 1;
  console.log(`✔ ${text}`);
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const health = await call('GET', '/health');
  check(health.status === 200 && health.data.db === 'connected', 'Server va baza ishlayapti');

  // --- Katalog
  const cats = await call('GET', '/categories');
  check(cats.status === 200 && cats.data.length > 0, `Kategoriyalar ko'rinadi (${cats.data.length} ta)`);
  const products = await call('GET', '/products?limit=50');
  check(products.status === 200 && products.data.total >= 20, `Mahsulotlar ko'rinadi (${products.data.total} ta)`);
  const search = await call('GET', `/products?search=${encodeURIComponent('sement')}`);
  check(search.data.data.length > 0 && search.data.data.every((p) => /sement/i.test(p.name + p.sku)), 'Qidiruv ishlaydi');
  const byCat = await call('GET', `/products?category_id=${cats.data[0].id}`);
  check(byCat.data.data.every((p) => p.category_id === cats.data[0].id), 'Kategoriya bo\'yicha filtr ishlaydi');

  // --- Ro'yxatdan o'tish va login
  const email = `test${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', { body: { full_name: 'Test Xaridor', email, password: 'parol123' } });
  check(reg.status === 201 && reg.data.token && reg.data.user.role === 'user', 'Ro\'yxatdan o\'tish (user roli)');
  const dup = await call('POST', '/auth/register', { body: { full_name: 'Test', email, password: 'parol123' } });
  check(dup.status === 409, 'Takroriy email rad etiladi');
  const badLogin = await call('POST', '/auth/login', { body: { email, password: 'notogri' } });
  check(badLogin.status === 401, 'Noto\'g\'ri parol rad etiladi');
  const login = await call('POST', '/auth/login', { body: { email, password: 'parol123' } });
  check(login.status === 200 && login.data.token, 'Login ishlaydi');
  const token = login.data.token;
  const me = await call('GET', '/auth/me', { token });
  check(me.status === 200 && me.data.email === email && !('password_hash' in me.data), '/auth/me parolsiz qaytadi');

  // --- Savatcha
  const product = products.data.data.find((p) => p.stock_quantity >= 5);
  const noAuth = await call('GET', '/cart');
  check(noAuth.status === 401, 'Savatcha tokensiz yopiq');
  let cart = await call('POST', '/cart/items', { token, body: { product_id: product.id, quantity: 2 } });
  check(cart.status === 201 && cart.data.count === 2, 'Savatchaga qo\'shish');
  cart = await call('POST', '/cart/items', { token, body: { product_id: product.id, quantity: 1 } });
  check(cart.data.items.length === 1 && cart.data.items[0].quantity === 3, 'Qayta qo\'shilsa miqdor oshadi');
  const itemId = cart.data.items[0].id;
  cart = await call('PUT', `/cart/items/${itemId}`, { token, body: { quantity: 4 } });
  check(cart.data.items[0].quantity === 4, 'Miqdorni o\'zgartirish');
  const tooMany = await call('PUT', `/cart/items/${itemId}`, { token, body: { quantity: product.stock_quantity + 1 } });
  check(tooMany.status === 400, 'Qoldiqdan ko\'p miqdor rad etiladi');
  const other = products.data.data.find((p) => p.id !== product.id && p.stock_quantity > 0);
  cart = await call('POST', '/cart/items', { token, body: { product_id: other.id } });
  cart = await call('DELETE', `/cart/items/${cart.data.items.find((i) => i.product_id === other.id).id}`, { token });
  check(cart.data.items.length === 1, 'Savatchadan olib tashlash');

  // --- Buyurtma
  const noAddr = await call('POST', '/orders', { token, body: { phone: '' } });
  check(noAddr.status === 400, 'Telefon/manzilsiz buyurtma rad etiladi');
  const order = await call('POST', '/orders', {
    token, body: { phone: '+998901112233', address: 'Toshkent, Yunusobod 4-mavze', note: 'Test' },
  });
  check(order.status === 201 && order.data.status === 'new' && order.data.items.length === 1, 'Buyurtma yaratildi');
  check(order.data.total_amount === product.price * 4, 'Buyurtma summasi to\'g\'ri');
  const after = await call('GET', `/products/${product.id}`);
  check(after.data.stock_quantity === product.stock_quantity - 4, 'Qoldiq kamaydi');
  const emptyCart = await call('GET', '/cart', { token });
  check(emptyCart.data.items.length === 0, 'Buyurtmadan keyin savatcha bo\'sh');
  const again = await call('POST', '/orders', { token, body: { phone: '+998901112233', address: 'Toshkent' } });
  check(again.status === 400, 'Bo\'sh savatcha bilan buyurtma rad etiladi');
  const mine = await call('GET', '/orders', { token });
  check(mine.data.length === 1 && mine.data[0].id === order.data.id, 'Buyurtmalarim ko\'rinadi');

  // --- Ruxsatlar
  const forbidden = await call('GET', '/admin/orders', { token });
  check(forbidden.status === 403, 'User admin bo\'limiga kira olmaydi');

  // --- Admin
  const adminLogin = await call('POST', '/auth/login', { body: { email: 'admin@qurilish.uz', password: 'admin123' } });
  check(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Admin login');
  const at = adminLogin.data.token;

  const cat = await call('POST', '/admin/categories', { token: at, body: { name: `Test kategoriya ${Date.now()}` } });
  check(cat.status === 201, 'Admin kategoriya qo\'shadi');
  const prod = await call('POST', '/admin/products', {
    token: at, body: { name: 'Test mahsulot', category_id: cat.data.id, price: 1000, stock_quantity: 5, unit: 'dona' },
  });
  check(prod.status === 201 && prod.data.category_id__label === cat.data.name, 'Admin mahsulot qo\'shadi');
  const badProd = await call('POST', '/admin/products', { token: at, body: { name: 'X', category_id: cat.data.id, price: -5 } });
  check(badProd.status === 400 && badProd.data.details.price, 'Manfiy narx rad etiladi');
  const upd = await call('PUT', `/admin/products/${prod.data.id}`, { token: at, body: { price: 1500, status: 'inactive' } });
  check(upd.status === 200 && upd.data.price === 1500, 'Admin mahsulotni tahrirlaydi');
  const hidden = await call('GET', `/products/${prod.data.id}`);
  check(hidden.status === 404, 'Nofaol mahsulot katalogda ko\'rinmaydi');
  const catDelBlocked = await call('DELETE', `/admin/categories/${cat.data.id}`, { token: at });
  check(catDelBlocked.status === 409, 'Mahsuloti bor kategoriyani o\'chirib bo\'lmaydi');
  check((await call('DELETE', `/admin/products/${prod.data.id}`, { token: at })).status === 200, 'Admin mahsulotni o\'chiradi');
  check((await call('DELETE', `/admin/categories/${cat.data.id}`, { token: at })).status === 200, 'Admin kategoriyani o\'chiradi');

  const all = await call('GET', '/admin/orders?status=new', { token: at });
  check(all.status === 200 && all.data.data.some((o) => o.id === order.data.id), 'Admin barcha buyurtmalarni ko\'radi');
  const wrong = await call('PATCH', `/admin/orders/${order.data.id}/status`, { token: at, body: { status: 'delivered' } });
  check(wrong.status === 400, 'Noto\'g\'ri holat o\'tishi rad etiladi');
  const conf = await call('PATCH', `/admin/orders/${order.data.id}/status`, { token: at, body: { status: 'confirmed' } });
  check(conf.status === 200 && conf.data.status === 'confirmed', 'Admin buyurtmani tasdiqlaydi');
  const canc = await call('PATCH', `/admin/orders/${order.data.id}/status`, { token: at, body: { status: 'cancelled' } });
  check(canc.data.status === 'cancelled', 'Admin buyurtmani bekor qiladi');
  const restored = await call('GET', `/products/${product.id}`);
  check(restored.data.stock_quantity === product.stock_quantity, 'Bekor qilinganda qoldiq qaytdi');

  console.log(`\n✅ Hammasi o'tdi: ${passed} ta tekshiruv`);
})().catch((err) => {
  console.error(err.message);
  console.error(`(${passed} ta tekshiruv o'tgan edi)`);
  process.exit(1);
});
