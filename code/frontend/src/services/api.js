/**
 * Backend bilan aloqa (REST API). Barcha HTTP so'rovlar shu fayl orqali o'tadi.
 *   GET    /api/meta
 *   GET    /api/:resource?page=&limit=&search=&sort=&order=
 *   GET    /api/:resource/options
 *   POST   /api/:resource
 *   PUT    /api/:resource/:id
 *   DELETE /api/:resource/:id
 */
const BASE = (import.meta.env && import.meta.env.VITE_API_URL) || '/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Serverga ulanib bo\'lmadi. Backend ishga tushganini tekshiring.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Xato: ${res.status}`, res.status, data.details);
  return data;
}

export const api = {
  meta: () => request('GET', '/meta'),
  list: (resource, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    return request('GET', `/${resource}?${qs}`);
  },
  options: (resource) => request('GET', `/${resource}/options`),
  create: (resource, data) => request('POST', `/${resource}`, data),
  update: (resource, id, data) => request('PUT', `/${resource}/${id}`, data),
  remove: (resource, id) => request('DELETE', `/${resource}/${id}`),
};
