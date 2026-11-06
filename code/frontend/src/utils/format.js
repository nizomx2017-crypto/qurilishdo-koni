// Ko'rinish uchun yordamchi funksiyalar

// Bazadagi inglizcha qiymatlarning o'zbekcha nomlari
export const VALUE_LABELS = {
  active: 'Faol', inactive: 'Nofaol',
  in: 'Kirim', out: 'Chiqim',
  unpaid: 'To\'lanmagan', partial: 'Qisman', paid: 'To\'langan',
  new: 'Yangi', completed: 'Bajarildi', cancelled: 'Bekor qilingan',
  cash: 'Naqd', card: 'Karta', transfer: 'O\'tkazma', debt: 'Qarzga',
  pending: 'Kutilmoqda', open: 'Ochiq', closed: 'Yopilgan',
};

// Holat belgisi rangi
export const VALUE_TONE = {
  active: 'ok', paid: 'ok', completed: 'ok', in: 'ok', closed: 'muted',
  inactive: 'muted', cancelled: 'muted',
  unpaid: 'bad', out: 'bad', open: 'warn', partial: 'warn', pending: 'warn', new: 'info',
  debt: 'warn', cash: 'info', card: 'info', transfer: 'info',
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
