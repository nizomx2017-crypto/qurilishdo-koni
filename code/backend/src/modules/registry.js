/**
 * MODULLAR RO'YXATI (registry)
 * ------------------------------------------------------------
 * Admin oddiy CRUD bilan boshqaradigan jadvallar shu yerda bir marta tasvirlanadi:
 *   - table    : bazadagi jadval nomi
 *   - page     : pages.code — access kodlari shundan olinadi (PRODUCT_VIEW, PRODUCT_CREATE, ...)
 *   - label    : admin menyusida ko'rinadigan nom
 *   - display  : boshqa jadvallarda (select ichida) ko'rinadigan ustun
 *   - columns  : ustunlar ro'yxati
 *       type      : text | textarea | email | number | money | select | ref | password | datetime
 *       required  : majburiymi
 *       ref       : (type='ref' bo'lsa) qaysi resursga bog'langan
 *       options   : (type='select' bo'lsa) ruxsat etilgan qiymatlar
 *       readonly  : formada ko'rsatilmaydi (avtomatik hisoblanadi)
 *       hidden    : jadvalda ko'rsatilmaydi
 *       searchable: qidiruvda ishtirok etadi
 *       filterable: ?ustun=qiymat ko'rinishida filtrlash mumkin
 *       min, max, integer, minLength, maxLength : validatsiya qoidalari (validate.js)
 *
 * Savatcha va buyurtmalarning o'z qoidalari bor, ular alohida modullarda (cart/, orders/).
 * Admin formalari shu tavsifdan avtomatik quriladi (GET /api/admin/meta).
 */

const STATUS = {
  type: 'select', options: ['active', 'inactive'], default: 'active', filterable: true,
};

const resources = {
  products: {
    table: 'products',
    page: 'PRODUCT',
    label: 'Mahsulotlar',
    display: 'name',
    columns: {
      name:           { label: 'Nomi', type: 'text', required: true, searchable: true, maxLength: 150 },
      category_id:    { label: 'Kategoriya', type: 'ref', ref: 'categories', required: true, filterable: true },
      sku:            { label: 'SKU / kod', type: 'text', searchable: true, maxLength: 50 },
      unit:           { label: 'Birlik', type: 'text', required: true, default: 'dona', maxLength: 20 },
      price:          { label: 'Narx', type: 'money', required: true },
      stock_quantity: { label: 'Qoldiq', type: 'number', required: true, integer: true, min: 0, default: 0 },
      status:         { label: 'Holat', ...STATUS },
      image_url:      { label: 'Rasm manzili (URL)', type: 'text', hidden: true, maxLength: 500 },
      description:    { label: 'Tavsif', type: 'textarea', hidden: true, maxLength: 2000 },
      created_at:     { label: 'Yaratilgan', type: 'datetime', readonly: true, hidden: true },
    },
  },

  categories: {
    table: 'categories',
    page: 'CATEGORY',
    label: 'Kategoriyalar',
    display: 'name',
    columns: {
      name:        { label: 'Nomi', type: 'text', required: true, searchable: true, maxLength: 100 },
      description: { label: 'Tavsif', type: 'textarea', maxLength: 1000 },
      status:      { label: 'Holat', ...STATUS },
      created_at:  { label: 'Yaratilgan', type: 'datetime', readonly: true, hidden: true },
    },
  },
};

function getResource(name) {
  return Object.prototype.hasOwnProperty.call(resources, name) ? resources[name] : null;
}

module.exports = { resources, getResource };
