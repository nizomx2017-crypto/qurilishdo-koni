// Ko'rinish uchun yordamchi funksiyalar

// Bazadagi inglizcha qiymatlarning o'zbekcha nomlari
export const VALUE_LABELS = {
  active: 'Faol', inactive: 'Nofaol',
  new: 'Yangi', confirmed: 'Tasdiqlangan', shipped: 'Yo\'lda',
  delivered: 'Yetkazildi', cancelled: 'Bekor qilingan',
};

// Holat belgisi rangi
export const VALUE_TONE = {
  active: 'ok', inactive: 'muted',
  new: 'info', confirmed: 'warn', shipped: 'warn', delivered: 'ok', cancelled: 'muted',
};

// Buyurtma holatini qaysi holatlarga o'tkazish mumkin (backenddagi qoida bilan bir xil)
export const ORDER_TRANSITIONS = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatNumber(v) {
  return v === null || v === undefined || v === '' ? '' : nf.format(Number(v)).replace(/,/g, '.');
}

export function formatMoney(v) {
  return v === null || v === undefined || v === '' ? '' : `${formatNumber(v)} so'm`;
}

export function formatDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
