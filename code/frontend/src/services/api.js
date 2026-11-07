/**
 * Backend bilan aloqa (REST API). Barcha HTTP so'rovlar shu fayl orqali o'tadi.
 * Token localStorage'da saqlanadi va har so'rovga "Authorization: Bearer ..." bo'lib qo'shiladi.
 *
 * VITE_API_URL bo'sh bo'lsa — /api (lokalda vite proxy orqali localhost:5000 ga boradi).
 * Deploy'da: VITE_API_URL=https://<render-servis>.onrender.com/api
 */
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'qd_token';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* bo'sh */ }
  },
};

// Token eskirsa (401) AuthContext foydalanuvchini chiqarib yuborishi uchun
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, path, body) {
  const token = tokenStore.get();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Serverga ulanib bo\'lmadi. Internet yoki backend ishlayotganini tekshiring.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(data.error || `Xato: ${res.status}`, res.status, data.details);
  }
  return data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Auth
  login: (data) => request('POST', '/auth/login', data),
  register: (data) => request('POST', '/auth/register', data),
  me: () => request('GET', '/auth/me'),

  // Katalog
  categories: () => request('GET', '/categories'),
  products: (params) => request('GET', `/products${qs(params)}`),
  product: (id) => request('GET', `/products/${id}`),

  // Savatcha
  cart: () => request('GET', '/cart'),
  addToCart: (product_id, quantity = 1) => request('POST', '/cart/items', { product_id, quantity }),
  updateCartItem: (id, quantity) => request('PUT', `/cart/items/${id}`, { quantity }),
  removeCartItem: (id) => request('DELETE', `/cart/items/${id}`),

  // Buyurtmalar
  checkout: (data) => request('POST', '/orders', data),
  myOrders: () => request('GET', '/orders'),

  // Admin
  admin: {
    meta: () => request('GET', '/admin/meta'),
    list: (resource, params) => request('GET', `/admin/${resource}${qs(params)}`),
    options: (resource) => request('GET', `/admin/${resource}/options`),
    create: (resource, data) => request('POST', `/admin/${resource}`, data),
    update: (resource, id, data) => request('PUT', `/admin/${resource}/${id}`, data),
    remove: (resource, id) => request('DELETE', `/admin/${resource}/${id}`),
    orders: (params) => request('GET', `/admin/orders${qs(params)}`),
    setOrderStatus: (id, status) => request('PATCH', `/admin/orders/${id}/status`, { status }),
  },
};
