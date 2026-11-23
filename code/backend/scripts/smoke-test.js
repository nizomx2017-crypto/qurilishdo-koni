/**
 * Ishlab turgan API'ni tez tekshirish (smoke test):  npm run test:smoke
 * Standart: http://localhost:5000/api, API_URL bilan o'zgartiring (masalan Render manzili).
 * Bazaga yozmaydi va hech kimning hisobini bloklamaydi — production'da ham ishlatish mumkin.
 * To'liq tekshiruv (login, RBAC, sessiya) — npm test (alohida test bazasida).
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let passed = 0;

function check(cond, text) {
  if (!cond) throw new Error(`❌ ${text}`);
  passed += 1;
  console.log(`✔ ${text}`);
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const health = await call('GET', '/health');
  check(health.status === 200 && health.data.db === 'connected', 'Server va baza ishlayapti');

  const cats = await call('GET', '/categories');
  check(cats.status === 200 && cats.data.length > 0, `Kategoriyalar ko'rinadi (${cats.data.length} ta)`);
  const products = await call('GET', '/products?limit=50');
  check(products.status === 200 && products.data.data.length > 0, `Mahsulotlar ko'rinadi (${products.data.total} ta)`);
  check(products.data.data.every((p) => !('status' in p) && !('created_at' in p)), 'Katalogda ichki maydonlar yo\'q');
  const search = await call('GET', `/products?search=${encodeURIComponent('sement')}`);
  check(search.status === 200, 'Qidiruv ishlaydi');

  const order = await call('POST', '/orders', {
    customer_name: 'Smoke', phone: '+998900000000', address: 'Smoke test manzil',
    items: [{ product_id: products.data.data[0].id, quantity: 1 }],
  });
  check(order.status === 400 && order.data.error.code === 'CAPTCHA_REQUIRED', 'Buyurtma captcha\'siz qabul qilinmaydi');

  const captcha = await call('GET', '/auth/captcha');
  check(captcha.status === 200 && captcha.data.captchaId && /^<svg/.test(captcha.data.svg), 'Captcha rasmi beriladi');

  for (const path of ['/auth/me', '/admin/orders', '/admin/products', '/users', '/roles', '/login-attempts']) {
    const res = await call('GET', path);
    check(res.status === 401 && res.data.error && res.data.error.code, `Panel yopiq: ${path} -> 401`);
  }
  check((await call('POST', '/auth/register', {})).status === 404, 'Mijoz ro\'yxatdan o\'tishi yo\'q');

  console.log(`\n✅ Hammasi o'tdi: ${passed} ta tekshiruv`);
})().catch((err) => {
  console.error(err.message);
  console.error(`(${passed} ta tekshiruv o'tgan edi)`);
  process.exit(1);
});
