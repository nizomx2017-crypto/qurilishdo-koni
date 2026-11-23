/**
 * Backend bilan aloqa (REST API). Barcha HTTP so'rovlar shu fayl orqali o'tadi.
 *
 * VITE_API_URL bo'sh bo'lsa — /api (lokalda vite proxy orqali localhost:5000 ga boradi).
 * Deploy'da: VITE_API_URL=https://<render-servis>.onrender.com/api
 *
 * Xodim sessiyasi (faqat panel so'rovlari uchun):
 *  - access (15 daqiqa) va refresh (7 kun) tokenlar localStorage'da (frontend va backend turli domenlarda);
 *  - "Authorization: Bearer" avtomatik qo'shiladi;
 *  - 401 kelsa — bir marta /auth/refresh, keyin so'rov qaytariladi. Bir vaqtdagi bir nechta 401 BITTA
 *    refresh'ni kutadi; boshqa tablar bilan ham navbat (Web Locks), aks holda server eski refresh tokenni
 *    "o'g'irlangan" deb hisoblab barcha sessiyalarni yopardi;
 *  - refresh ham xato bo'lsa — sessiya tugaydi (onSessionEnd).
 * Mijoz so'rovlari (katalog, buyurtma) tokensiz yuboriladi.
 */
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const ACCESS_KEY = 'qd_access';
const REFRESH_KEY = 'qd_refresh';

export class ApiError extends Error {
  constructor(message, status, { code, details, ...extra } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.assign(this, extra); // requiredAccess, retryAfterSeconds ...
  }
}

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch { /* bo'sh: brauzer saqlashni taqiqlagan */ }
  },
};
storage.set('qd_token', null); // eski (mijoz akkaunti davridagi) token

export const tokenStore = {
  access: () => storage.get(ACCESS_KEY),
  refresh: () => storage.get(REFRESH_KEY),
  set({ accessToken, refreshToken }) {
    storage.set(ACCESS_KEY, accessToken);
    if (refreshToken) storage.set(REFRESH_KEY, refreshToken);
  },
  clear() {
    storage.set(ACCESS_KEY, null);
    storage.set(REFRESH_KEY, null);
  },
  REFRESH_KEY,
};

let onSessionEnd = () => {};
export function setSessionEndHandler(fn) { onSessionEnd = fn; }

async function send(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Serverga ulanib bo\'lmadi. Internet yoki backend ishlayotganini tekshiring.', 0, { code: 'NETWORK' });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Yagona format: { error: { code, message, details?, ... } }
    const err = data && typeof data.error === 'object' && data.error !== null ? data.error : {};
    const { message, ...rest } = err;
    throw new ApiError(message || `Xato: ${res.status}`, res.status, rest);
  }
  return data;
}

// ------------------------------------------------------------------ refresh (bitta navbat)
let refreshing = null;

async function rotate(staleRefresh) {
  const current = tokenStore.refresh();
  if (!current) throw new ApiError('Sessiya tugadi. Qaytadan kiring', 401, { code: 'NO_SESSION' });
  if (current !== staleRefresh) return; // boshqa tab allaqachon yangilab bo'ldi — uning tokenidan foydalanamiz
  try {
    tokenStore.set(await send('POST', '/auth/refresh', { refreshToken: current }));
  } catch (e) {
    if (e.status === 401) {
      tokenStore.clear();
      onSessionEnd();
    }
    throw e;
  }
}

function refreshSession() {
  if (!refreshing) {
    const stale = tokenStore.refresh();
    const run = () => rotate(stale);
    const locked = typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('qd-refresh', run)
      : run();
    refreshing = locked.finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function authed(method, path, body) {
  if (refreshing) await refreshing.catch(() => {});
  try {
    return await send(method, path, body, tokenStore.access());
  } catch (e) {
    if (e.status !== 401 || !tokenStore.refresh()) throw e;
    await refreshSession();
    return send(method, path, body, tokenStore.access());
  }
}

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Xodim: kirish
  captcha: () => send('GET', '/auth/captcha'),
  login: (data) => send('POST', '/auth/login', data),
  logout: async () => {
    const refreshToken = tokenStore.refresh();
    tokenStore.clear();
    if (refreshToken) await send('POST', '/auth/logout', { refreshToken }).catch(() => {});
  },
  me: () => authed('GET', '/auth/me'),

  // Mijoz: katalog va buyurtma (akkauntsiz)
  categories: () => send('GET', '/categories'),
  products: (params) => send('GET', `/products${qs(params)}`),
  product: (id) => send('GET', `/products/${id}`),
  checkout: (data) => send('POST', '/orders', data),

  // Panel: mahsulot, kategoriya, buyurtma
  admin: {
    meta: () => authed('GET', '/admin/meta'),
    list: (resource, params) => authed('GET', `/admin/${resource}${qs(params)}`),
    options: (resource) => authed('GET', `/admin/${resource}/options`),
    create: (resource, data) => authed('POST', `/admin/${resource}`, data),
    update: (resource, id, data) => authed('PUT', `/admin/${resource}/${id}`, data),
    remove: (resource, id) => authed('DELETE', `/admin/${resource}/${id}`),
    orders: (params) => authed('GET', `/admin/orders${qs(params)}`),
    setOrderStatus: (id, status) => authed('PATCH', `/admin/orders/${id}/status`, { status }),
  },

  // Panel: boshqaruv
  users: {
    list: (params) => authed('GET', `/users${qs(params)}`),
    create: (data) => authed('POST', '/users', data),
    update: (id, data) => authed('PATCH', `/users/${id}`, data),
    setStatus: (id, isActive) => authed('PATCH', `/users/${id}/status`, { isActive }),
    regenerateCode: (id) => authed('POST', `/users/${id}/regenerate-code`),
  },
  roles: {
    list: () => authed('GET', '/roles'),
    create: (data) => authed('POST', '/roles', data),
    update: (id, data) => authed('PUT', `/roles/${id}`, data),
    remove: (id) => authed('DELETE', `/roles/${id}`),
    setAccesses: (id, accessIds) => authed('PUT', `/roles/${id}/accesses`, { accessIds }),
  },
  accesses: () => authed('GET', '/accesses'),
  loginAttempts: (params) => authed('GET', `/login-attempts${qs(params)}`),
};
