# Qurilishdo‘koni — boshqaruv tizimi (MVP)

Qurilish materiallari do‘koni uchun admin panel. Chap tomonda jadvallar menyusi,
o‘rtada tanlangan jadval: sahifalash, qidiruv, qo‘shish, tahrirlash va o‘chirish.
Barcha ma’lumotlar PostgreSQL bazasida saqlanadi.

| Qatlam   | Texnologiya                 | Papka              |
|----------|-----------------------------|--------------------|
| Frontend | React (Vite)                | `code/frontend/`   |
| Backend  | Node.js + Express, REST API | `code/backend/`    |
| Baza     | PostgreSQL                  | `code/database/`   |

```
Brauzer (React)  ──HTTP/JSON──▶  Express REST API  ──SQL──▶  PostgreSQL
   :5173            /api/...         :5000                     :5432
```

---

## 1. Kerakli dasturlar (bir marta o‘rnatiladi)

1. **Node.js 18+** — https://nodejs.org (LTS versiyasi)
2. **PostgreSQL 14+** — https://www.postgresql.org/download/windows/
   O‘rnatishda `postgres` foydalanuvchisiga parol so‘raydi, uni eslab qoling.

## 2. Ishga tushirish

### 2.1 Backend + baza

```bash
cd code/backend
npm install
copy .env.example .env      # Mac/Linux: cp .env.example .env
```

`.env` faylini oching va `DB_PASSWORD` ga PostgreSQL parolingizni yozing. Keyin:

```bash
npm run db:init             # bazani yaratadi, 12 ta jadval + namunaviy ma'lumotlar
npm run dev                 # API: http://localhost:5000/api
```

Tekshirish: brauzerda http://localhost:5000/api/health → `{"status":"ok","db":"connected"}`

> `npm run db:init` har safar jadvallarni **o‘chirib, qaytadan** yaratadi.

### 2.2 Frontend (yangi terminal oynasida)

```bash
cd code/frontend
npm install
npm run dev                 # http://localhost:5173
```

Namunaviy foydalanuvchilar paroli: `admin123`.

---

## 3. Jadvallar (12 ta)

| Menyu                | Jadval                | Izoh |
|----------------------|-----------------------|------|
| Mahsulotlar          | `products`            | qoldiq (stock_quantity) qo‘lda emas, ombor harakatlaridan hisoblanadi |
| Kategoriyalar        | `categories`          | `parent_id` orqali ichma-ich |
| Ombor harakatlari    | `inventory_movements` | kirim / chiqim |
| Yetkazib beruvchilar | `suppliers`           | |
| Sotuvlar             | `sales`               | jami summa sotuv qatorlaridan hisoblanadi |
| Sotuv qatorlari      | `sale_items`          | summa = miqdor × narx |
| Xaridorlar           | `customers`           | |
| To‘lovlar            | `payments`            | |
| Qarzlar              | `debts`               | xaridor yoki yetkazib beruvchi qarzi |
| Foydalanuvchilar     | `users`               | parol hash qilib saqlanadi |
| Rollar               | `roles`               | |
| Sozlamalar           | `settings`            | |

## 4. REST API

Har bir jadval uchun bir xil endpointlar (`:resource` = jadval nomi, masalan `products`):

| Metod  | Manzil                     | Vazifasi |
|--------|----------------------------|----------|
| GET    | `/api/meta`                | barcha bo‘limlar va ustunlar tavsifi |
| GET    | `/api/:resource`           | ro‘yxat: `?page=1&limit=10&search=&sort=id&order=desc` |
| GET    | `/api/:resource/options`   | select uchun `[{id, label}]` |
| GET    | `/api/:resource/:id`       | bitta yozuv |
| POST   | `/api/:resource`           | qo‘shish |
| PUT    | `/api/:resource/:id`       | tahrirlash |
| DELETE | `/api/:resource/:id`       | o‘chirish |

Ro‘yxat javobi:
```json
{ "data": [ ... ], "total": 30, "page": 1, "limit": 10, "pages": 3 }
```

Xato javobi (masalan validatsiya):
```json
{ "error": "Ma'lumotlar noto'g'ri to'ldirilgan", "details": { "name": "\"Nomi\" majburiy" } }
```

HTTP status kodlari: `200` OK, `201` yaratildi, `400` noto‘g‘ri ma’lumot, `404` topilmadi,
`409` ziddiyat (takroriy qiymat yoki bog‘langan yozuv bor), `500` server xatosi.

## 5. Backend tuzilmasi (monolit, lekin modullarga bo‘lingan)

```
code/backend/src/
├── server.js                  # kirish nuqtasi
├── app.js                     # express, middleware, marshrutlar
├── config/db.js               # PostgreSQL pool + tranzaksiya
├── api/
│   ├── routes/                # HTTP qatlami (faqat so'rov/javob)
│   ├── middleware/            # xatolarni ushlash
│   └── validators/            # kiruvchi ma'lumotni tekshirish
├── services/crud.service.js   # umumiy CRUD (pagination, qidiruv, tartiblash)
└── modules/
    ├── registry.js            # barcha jadvallar tavsifi (bitta joyda)
    ├── hooks.js
    ├── users/        users.service.js        # parolni hash qilish
    ├── inventory/    inventory.service.js    # kirim/chiqim -> qoldiq
    └── sales/        saleItems.service.js    # qator summasi, sotuv jami
```

**Nega shunday?** Biznes mantiq (`modules/*/…service.js`) HTTP qatlamidan (`api/routes`) ajratilgan.
Kelajakda, masalan, ombor modulini alohida microservice qilish kerak bo‘lsa,
`modules/inventory` papkasini o‘z API’si bilan alohida loyihaga ko‘chirish yetadi.

**Yangi jadval qo‘shish:** (1) `code/database/schema/` da SQL yozing, (2) `modules/registry.js` ga
bitta obyekt qo‘shing. Menyu, jadval va forma frontendda avtomatik paydo bo‘ladi.

## 6. Biznes qoidalar (avtomatik)

- **Ombor:** kirim qoldiqni oshiradi, chiqim kamaytiradi. Qoldiqdan ko‘p chiqim qilib bo‘lmaydi.
  Harakat tahrirlansa yoki o‘chirilsa, qoldiq qayta to‘g‘rilanadi. Hammasi bitta tranzaksiyada bajariladi.
- **Sotuv:** qator summasi = miqdor × narx (narx bo‘sh qolsa, mahsulotning sotish narxi olinadi);
  sotuvning jami summasi qatorlardan qayta hisoblanadi.
- **Foydalanuvchi:** parol `scrypt` bilan hash qilinadi va API javobida hech qachon qaytmaydi.
- **O‘chirish himoyasi:** boshqa jadvalda ishlatilayotgan yozuvni (masalan mahsuloti bor kategoriyani)
  o‘chirib bo‘lmaydi. Tushunarli xabar qaytadi.

## 7. Lovable dizaynini ulash

Topshiriq bo‘yicha frontend Lovable dizayni ustiga quriladi. Tartib:

1. Lovable’da yangi loyiha oching va shu promptni yozing:
   > Qurilish materiallari do'koni uchun admin panel dizayni (React + TypeScript + Tailwind + shadcn/ui).
   > Chapda menyu, 5 guruh: Katalog (Mahsulotlar, Kategoriyalar), Ombor (Ombor harakatlari,
   > Yetkazib beruvchilar), Savdo (Sotuvlar, Sotuv qatorlari, Xaridorlar), Moliya (To'lovlar, Qarzlar),
   > Tizim (Foydalanuvchilar, Rollar, Sozlamalar). O'rtada: sarlavha, qidiruv, "+ Qo'shish" tugmasi,
   > jadval (tahrirlash/o'chirish ikonkalari bilan), pastda sahifalash. Qo'shish/tahrirlash modal oynada.
   > Supabase ULAMANG: ma'lumotlar mening REST API'imdan keladi (http://localhost:5000/api).
2. Dizayn tayyor bo‘lgach, Lovable’dan GitHub’ga eksport qiling va kompyuteringizga yuklab oling.
3. Shu loyihadagi `code/frontend/src/services/api.js` faylini Lovable loyihasiga ko‘chiring.
   Lovable komponentlaridagi soxta (mock) ma’lumotlar o‘rniga `api.list(...)`, `api.create(...)`
   va boshqa funksiyalarni chaqiring. Qanday chaqirish kerakligini `code/frontend/src/App.jsx` va
   `components/` dagi kod ko‘rsatib turibdi.
4. Lovable loyihasining `vite.config.ts` fayliga proxy qo‘shing:
   ```ts
   server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } }
   ```

## 8. Ko‘p uchraydigan muammolar

| Belgi | Sabab va yechim |
|-------|-----------------|
| `password authentication failed` | `.env` dagi `DB_PASSWORD` noto‘g‘ri |
| `ECONNREFUSED ...5432` | PostgreSQL ishlamayapti: Windows’da Services → postgresql → Start |
| Frontend: "Serverga ulanib bo‘lmadi" | backend (`npm run dev`) ishga tushmagan |
| `port 5000 already in use` | `.env` da `PORT=5001` qiling va `vite.config.js` dagi proxy manzilini ham o‘zgartiring |
