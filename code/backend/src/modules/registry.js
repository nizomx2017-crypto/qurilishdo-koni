/**
 * MODULLAR RO'YXATI (registry)
 * ------------------------------------------------------------
 * Har bir jadval shu yerda bir marta tasvirlanadi:
 *   - table    : bazadagi jadval nomi
 *   - label    : menyuda ko'rinadigan nom
 *   - display  : boshqa jadvallarda (select ichida) ko'rinadigan ustun
 *   - columns  : ustunlar ro'yxati
 *       type     : text | textarea | number | money | select | ref | password | datetime
 *       required : majburiymi
 *       ref      : (type='ref' bo'lsa) qaysi resursga bog'langan
 *       options  : (type='select' bo'lsa) ruxsat etilgan qiymatlar
 *       readonly : formada ko'rsatilmaydi (avtomatik hisoblanadi)
 *       hidden   : jadvalda ko'rsatilmaydi
 *       searchable: qidiruvda ishtirok etadi
 *
 * Yangi jadval qo'shish = SQL'da jadval yaratish + shu yerga bitta obyekt qo'shish.
 * Frontend menyusi va formalari ham shu ma'lumotdan avtomatik quriladi (GET /api/meta).
 */

const STATUS = { type: 'select', options: ['active', 'inactive'], default: 'active' };

const resources = {
  products: {
    table: 'products',
    label: 'Mahsulotlar',
    group: 'Katalog',
    display: 'name',
    columns: {
      name:           { label: 'Nomi', type: 'text', required: true, searchable: true },
      category_id:    { label: 'Kategoriya', type: 'ref', ref: 'categories', required: true },
      sku:            { label: 'SKU / kod', type: 'text', searchable: true },
      unit:           { label: 'Birlik', type: 'text', required: true, default: 'dona' },
      purchase_price: { label: 'Kelish narxi', type: 'money', required: true },
      sale_price:     { label: 'Sotish narxi', type: 'money', required: true },
      stock_quantity: { label: 'Qoldiq', type: 'number', readonly: true },
      status:         { label: 'Holat', ...STATUS },
      created_at:     { label: 'Yaratilgan', type: 'datetime', readonly: true, hidden: true },
    },
  },

  categories: {
    table: 'categories',
    label: 'Kategoriyalar',
    group: 'Katalog',
    display: 'name',
    columns: {
      name:      { label: 'Nomi', type: 'text', required: true, searchable: true },
      parent_id: { label: 'Ota kategoriya', type: 'ref', ref: 'categories' },
      status:    { label: 'Holat', ...STATUS },
    },
  },

  inventory_movements: {
    table: 'inventory_movements',
    label: 'Ombor harakatlari',
    group: 'Ombor',
    display: 'id',
    columns: {
      product_id: { label: 'Mahsulot', type: 'ref', ref: 'products', required: true },
      type:       { label: 'Turi', type: 'select', options: ['in', 'out'], required: true, default: 'in' },
      quantity:   { label: 'Miqdor', type: 'number', required: true },
      reason:     { label: 'Sabab', type: 'textarea', searchable: true },
      created_by: { label: 'Kim kiritdi', type: 'ref', ref: 'users' },
      created_at: { label: 'Sana', type: 'datetime', readonly: true },
    },
  },

  suppliers: {
    table: 'suppliers',
    label: 'Yetkazib beruvchilar',
    group: 'Ombor',
    display: 'name',
    columns: {
      name:           { label: 'Nomi', type: 'text', required: true, searchable: true },
      phone:          { label: 'Telefon', type: 'text', searchable: true },
      contact_person: { label: 'Mas\'ul shaxs', type: 'text', searchable: true },
      address:        { label: 'Manzil', type: 'textarea' },
      status:         { label: 'Holat', ...STATUS },
    },
  },

  sales: {
    table: 'sales',
    label: 'Sotuvlar',
    group: 'Savdo',
    display: 'id',
    columns: {
      customer_id:    { label: 'Xaridor', type: 'ref', ref: 'customers', required: true },
      user_id:        { label: 'Sotuvchi', type: 'ref', ref: 'users' },
      total_amount:   { label: 'Jami summa', type: 'money', readonly: true },
      payment_status: { label: 'To\'lov holati', type: 'select', options: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
      status:         { label: 'Holat', type: 'select', options: ['new', 'completed', 'cancelled'], default: 'new' },
      created_at:     { label: 'Sana', type: 'datetime', readonly: true },
    },
  },

  sale_items: {
    table: 'sale_items',
    label: 'Sotuv qatorlari',
    group: 'Savdo',
    display: 'id',
    columns: {
      sale_id:     { label: 'Sotuv №', type: 'ref', ref: 'sales', required: true },
      product_id:  { label: 'Mahsulot', type: 'ref', ref: 'products', required: true },
      quantity:    { label: 'Miqdor', type: 'number', required: true },
      unit_price:  { label: 'Narx (bo\'sh = sotish narxi)', type: 'money' },
      total_price: { label: 'Summa', type: 'money', readonly: true },
    },
  },

  customers: {
    table: 'customers',
    label: 'Xaridorlar',
    group: 'Savdo',
    display: 'name',
    columns: {
      name:    { label: 'Ismi / kompaniya', type: 'text', required: true, searchable: true },
      phone:   { label: 'Telefon', type: 'text', searchable: true },
      address: { label: 'Manzil', type: 'textarea' },
      balance: { label: 'Balans', type: 'money' },
      status:  { label: 'Holat', ...STATUS },
    },
  },

  payments: {
    table: 'payments',
    label: 'To\'lovlar',
    group: 'Moliya',
    display: 'id',
    columns: {
      sale_id:        { label: 'Sotuv №', type: 'ref', ref: 'sales' },
      customer_id:    { label: 'Xaridor', type: 'ref', ref: 'customers' },
      amount:         { label: 'Summa', type: 'money', required: true },
      payment_method: { label: 'Usul', type: 'select', options: ['cash', 'card', 'transfer', 'debt'], default: 'cash' },
      status:         { label: 'Holat', type: 'select', options: ['pending', 'completed', 'cancelled'], default: 'completed' },
      created_at:     { label: 'Sana', type: 'datetime', readonly: true },
    },
  },

  debts: {
    table: 'debts',
    label: 'Qarzlar',
    group: 'Moliya',
    display: 'id',
    columns: {
      customer_id: { label: 'Xaridor', type: 'ref', ref: 'customers' },
      supplier_id: { label: 'Yetkazib beruvchi', type: 'ref', ref: 'suppliers' },
      amount:      { label: 'Summa', type: 'money', required: true },
      status:      { label: 'Holat', type: 'select', options: ['open', 'closed'], default: 'open' },
      created_at:  { label: 'Sana', type: 'datetime', readonly: true },
    },
  },

  users: {
    table: 'users',
    label: 'Foydalanuvchilar',
    group: 'Tizim',
    display: 'full_name',
    columns: {
      full_name: { label: 'F.I.Sh.', type: 'text', required: true, searchable: true },
      email:     { label: 'Email', type: 'text', required: true, searchable: true },
      // Parol bazaga ochiq holda yozilmaydi — users.service.js uni hash qiladi.
      password:  { label: 'Parol', type: 'password', required: 'create', virtual: true, hidden: true },
      role_id:   { label: 'Rol', type: 'ref', ref: 'roles', required: true },
      status:    { label: 'Holat', ...STATUS },
      created_at:{ label: 'Yaratilgan', type: 'datetime', readonly: true },
    },
  },

  roles: {
    table: 'roles',
    label: 'Rollar',
    group: 'Tizim',
    display: 'name',
    columns: {
      name:        { label: 'Nomi', type: 'text', required: true, searchable: true },
      description: { label: 'Tavsif', type: 'textarea', searchable: true },
    },
  },

  settings: {
    table: 'settings',
    label: 'Sozlamalar',
    group: 'Tizim',
    display: 'key',
    columns: {
      key:         { label: 'Kalit', type: 'text', required: true, searchable: true },
      value:       { label: 'Qiymat', type: 'text', searchable: true },
      description: { label: 'Tavsif', type: 'textarea' },
    },
  },
};

function getResource(name) {
  return Object.prototype.hasOwnProperty.call(resources, name) ? resources[name] : null;
}

module.exports = { resources, getResource };
