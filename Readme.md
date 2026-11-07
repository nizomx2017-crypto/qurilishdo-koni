# Qurilishdo‘koni

Qurilish va sanoat materiallari uchun o‘quv internet-do‘kon (MVP).

Foydalanuvchi katalogdan mahsulot topadi, savatchaga qo‘shadi va buyurtma beradi.
Admin kategoriya va mahsulotlarni boshqaradi, barcha buyurtmalarni ko‘radi va ularning holatini o‘zgartiradi.
Talablar: [docs/umumiy/](docs/umumiy/).

## Imkoniyatlar

| Kim   | Nima qila oladi |
|-------|-----------------|
| Mehmon | Katalogni ko‘rish, kategoriya bo‘yicha filtr, nom bo‘yicha qidiruv, mahsulot sahifasi |
| User  | Ro‘yxatdan o‘tish va login, savatcha (qo‘shish, miqdorni o‘zgartirish, olib tashlash), buyurtma berish, o‘z buyurtmalarini ko‘rish |
| Admin | User huquqlari + kategoriya va mahsulot CRUD, barcha buyurtmalar ro‘yxati, buyurtma holatini o‘zgartirish |

## Texnologiyalar

| Qatlam   | Texnologiya | Papka |
|----------|-------------|-------|
| Frontend | React 18 + Vite, react-router, oddiy CSS | [code/frontend/](code/frontend/) |
| Backend  | Node.js + Express, JWT, helmet, express-rate-limit | [code/backend/](code/backend/) |
| Baza     | PostgreSQL (lokal yoki Supabase) | [code/database/](code/database/) |

```
Brauzer (React)  ──HTTP/JSON + JWT──▶  Express REST API  ──SQL──▶  PostgreSQL
   :5173 / Vercel        /api/...          :5000 / Render             lokal / Supabase
```

## Loyiha tuzilmasi

```
code/
├── database/
│   ├── schema/001_schema.sql   # 7 jadval: roles, users, categories, products, cart_items, orders, order_items
│   └── seed/001_seed.sql       # admin, user, 8 kategoriya, 29 mahsulot, namunaviy buyurtma
├── backend/
│   ├── scripts/db-init.js      # sxema + seed (npm run db:init)
│   ├── scripts/smoke-test.js   # asosiy oqim tekshiruvi (npm run test:smoke)
│   └── src/
│       ├── app.js, server.js
│       ├── config/             # db.js (DATABASE_URL + SSL), env.js (JWT, CORS)
│       ├── api/
│       │   ├── middleware/     # auth.js (JWT, admin), errorHandler.js
│       │   ├── routes/         # auth, catalog, cart, orders, admin, crud, meta
│       │   └── validators/     # validate.js
│       ├── services/crud.service.js   # umumiy CRUD: sahifalash, qidiruv, filtr
│       └── modules/
│           ├── registry.js     # admin CRUD resurslari (categories, products)
│           ├── auth/ catalog/ cart/ orders/ users/
└── frontend/
    ├── vercel.json             # SPA marshrutlari uchun rewrite
    └── src/
        ├── pages/              # Catalog, Product, Cart, Orders, Login, Register, admin/*
        ├── components/         # layout, shop, tables, forms, modals
        ├── context/            # Auth, Cart, Toast
        └── services/api.js     # barcha HTTP so'rovlar
docs/umumiy/                    # MVP talablari va qarorlar
render.yaml                     # Render Blueprint (backend)
```

## Lokal ishga tushirish

Kerak: **Node.js 18+** va **PostgreSQL 14+** (yoki Supabase loyihasi).

### 1. Backend + baza

```bash
cd code/backend
npm install
copy .env.example .env        # Mac/Linux: cp .env.example .env
```

`.env` ni to‘ldiring (pastdagi jadvalga qarang): lokal baza uchun `DB_PASSWORD`, Supabase uchun `DATABASE_URL`. Keyin:

```bash
npm run db:init               # jadvallar + namunaviy ma'lumotlar
npm run dev                   # API: http://localhost:5000/api
```

Tekshirish: http://localhost:5000/api/health → `{"status":"ok","db":"connected"}`

> ⚠️ `npm run db:init` mavjud jadvallarni **o‘chirib, qaytadan** yaratadi (eski 12 jadvalli ombor versiyasining jadvallarini ham). Ishlab turgan bazada ishlatmang.

### 2. Frontend (yangi terminalda)

```bash
cd code/frontend
npm install
npm run dev                   # http://localhost:5173
```

Lokalda `VITE_API_URL` bo‘sh qoladi: `/api` so‘rovlari vite proxy orqali `localhost:5000` ga boradi.
Backend boshqa portda bo‘lsa: `VITE_PROXY_TARGET=http://localhost:5001 npm run dev`.

### 3. Namunaviy hisoblar

| Rol   | Email | Parol |
|-------|-------|-------|
| Admin | `admin@qurilish.uz` | `admin123` |
| User  | `user@qurilish.uz`  | `user123`  |

### 4. Tekshirish

Backend ishlab turganda:

```bash
cd code/backend
npm run test:smoke            # 38 ta tekshiruv: katalog, auth, savatcha, buyurtma, ruxsatlar, admin
```

Boshqa manzilni tekshirish: `API_URL=https://.../api npm run test:smoke`. Skript test foydalanuvchi va buyurtma yaratadi
(buyurtmani oxirida bekor qiladi, qoldiq qaytadi) — production bazada ishlatmang.

## `.env` sozlamalari

**Backend** (`code/backend/.env`):

| O‘zgaruvchi | Majburiy | Izoh |
|-------------|----------|------|
| `DATABASE_URL` | Supabase/Render’da ha | To‘liq ulanish manzili. Berilsa, `DB_*` e’tiborga olinmaydi |
| `DB_SSL` | yo‘q | `true`/`false`. Bo‘sh bo‘lsa: manzilda `supabase` bo‘lsa SSL yoqiladi |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | lokalda | `DATABASE_URL` bo‘lmasa ishlatiladi |
| `JWT_SECRET` | production’da ha | Uzun tasodifiy qator: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | yo‘q | Token muddati, standart `7d` |
| `CORS_ORIGIN` | production’da ha | Frontend manzili; bir nechtasi vergul bilan |
| `NODE_ENV` | yo‘q | `production` bo‘lsa `JWT_SECRET` majburiy |
| `PORT` | yo‘q | Standart `5000` (Render o‘zi beradi) |

**Frontend** (`code/frontend/.env`, faqat deploy uchun):

| O‘zgaruvchi | Izoh |
|-------------|------|
| `VITE_API_URL` | Backend manzili, masalan `https://qurilishdokoni-api.onrender.com/api`. Lokalda bo‘sh |

## REST API

Barcha javoblar JSON. Himoyalangan so‘rovlarda header: `Authorization: Bearer <token>`.

### Auth

| Metod | Manzil | Kim | Tavsif |
|-------|--------|-----|--------|
| POST | `/api/auth/register` | hamma | `{ full_name, email, phone?, password }` → `{ token, user }` (har doim `user` roli) |
| POST | `/api/auth/login` | hamma | `{ email, password }` → `{ token, user }` |
| GET  | `/api/auth/me` | login | joriy foydalanuvchi |

### Katalog (login shart emas)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| GET | `/api/categories` | faol kategoriyalar va mahsulotlar soni |
| GET | `/api/products` | `?search=&category_id=&sort=id\|name\|price&order=asc\|desc&page=1&limit=12` |
| GET | `/api/products/:id` | bitta mahsulot |

Faqat faol (`active`) kategoriyadagi faol mahsulotlar ko‘rinadi.

### Savatcha (login)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| GET    | `/api/cart` | `{ items, total, count }` |
| POST   | `/api/cart/items` | `{ product_id, quantity? }` — bor bo‘lsa miqdor qo‘shiladi |
| PUT    | `/api/cart/items/:id` | `{ quantity }` |
| DELETE | `/api/cart/items/:id` | qatorni olib tashlash |
| DELETE | `/api/cart` | savatchani tozalash |

### Buyurtmalar (login)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| POST | `/api/orders` | `{ phone, address, note? }` — savatchadan buyurtma |
| GET  | `/api/orders` | o‘z buyurtmalari (qatorlari bilan) |

Buyurtma **bitta tranzaksiyada** bajariladi: mahsulot qatorlari qulflanadi (`SELECT … FOR UPDATE`), qoldiq tekshiriladi,
`orders` + `order_items` yoziladi, qoldiq kamaytiriladi, savatcha tozalanadi. Biror qadam xato bersa, hammasi bekor bo‘ladi.
Ikki xaridor bir vaqtda oxirgi donani ololmaydi (biri `409` oladi).

### Admin (faqat `admin` roli)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| GET    | `/api/admin/meta` | admin formalari uchun ustunlar tavsifi |
| GET    | `/api/admin/orders` | `?status=&search=&page=&limit=` barcha buyurtmalar |
| PATCH  | `/api/admin/orders/:id/status` | `{ status }` |
| GET    | `/api/admin/:resource` | `categories` yoki `products`: `?page=&limit=&search=&sort=&order=&status=&category_id=` |
| GET    | `/api/admin/:resource/options` | select uchun `[{ id, label }]` |
| GET / POST / PUT / DELETE | `/api/admin/:resource[/:id]` | CRUD |

Buyurtma holatlari: `new → confirmed → shipped → delivered`; `delivered` dan oldin istalgan bosqichda `cancelled`.
Bekor qilinganda mahsulotlar qoldig‘i qaytariladi.

### Javob va xatolar

```json
{ "data": [ ... ], "total": 29, "page": 1, "limit": 12, "pages": 3 }
{ "error": "Ma'lumotlar noto'g'ri to'ldirilgan", "details": { "price": "\"Narx\" 0 dan kichik bo'lmasin" } }
```

`200` OK · `201` yaratildi · `400` noto‘g‘ri ma’lumot · `401` login kerak · `403` ruxsat yo‘q · `404` topilmadi ·
`409` ziddiyat (takroriy email, bog‘langan yozuv, qoldiq yetmaydi) · `429` so‘rovlar juda ko‘p · `503` baza ishlamayapti.

### Xavfsizlik

- Parollar `scrypt` bilan hash qilinadi, API javobida qaytmaydi.
- JWT har so‘rovda bazadagi foydalanuvchi bilan solishtiriladi (bloklangan foydalanuvchi eski token bilan kira olmaydi).
- `helmet` xavfsizlik headerlari; rate-limit: `/api` — 15 daqiqada 300 so‘rov, login/ro‘yxat — 15 daqiqada 20 so‘rov.
- Kiruvchi ma’lumot server tomonda tekshiriladi; SQL faqat parametrlar bilan, ustun nomlari faqat `registry.js` dan.

## Deploy: Supabase + Render + Vercel

### 1. Baza — Supabase

1. https://supabase.com da yangi loyiha yarating, baza parolini saqlang.
2. **Connect** → **Session pooler** URI’ni oling (Render IPv4 ishlatadi, to‘g‘ridan-to‘g‘ri ulanish manzili IPv6 — ishlamasligi mumkin):
   `postgresql://postgres.<ref>:<PAROL>@aws-0-<region>.pooler.supabase.com:5432/postgres`
3. Jadvallarni yarating — ikki yo‘ldan biri:
   - kompyuteringizdan: `code/backend/.env` ga shu `DATABASE_URL` ni yozing va `npm run db:init`;
   - yoki Supabase **SQL Editor** da `001_schema.sql`, keyin `001_seed.sql` ni bajaring.
4. Production’da seed’dagi `admin123` parolini darhol almashtiring (yoki seed o‘rniga o‘z admin foydalanuvchingizni yarating).

### 2. Backend — Render

1. https://render.com → **New → Blueprint** → shu GitHub repozitoriyni tanlang ([render.yaml](render.yaml) o‘qiladi).
   Qo‘lda yaratsangiz: **Web Service**, Root Directory `code/backend`, Build `npm ci`, Start `npm start`, Health check `/api/health`.
2. Environment: `DATABASE_URL` (Supabase pooler), `CORS_ORIGIN` (Vercel manzili, 3-qadamdan keyin), `JWT_SECRET` (Blueprint o‘zi yaratadi), `NODE_ENV=production`.
3. Tekshirish: `https://<servis>.onrender.com/api/health`.
   Bepul tarifda servis 15 daqiqa so‘rov bo‘lmasa uxlaydi — birinchi so‘rov ~1 daqiqa kechikishi mumkin.

### 3. Frontend — Vercel

1. https://vercel.com → **Add New → Project** → repozitoriyni tanlang.
2. **Root Directory**: `code/frontend` (Framework: Vite, Build: `npm run build`, Output: `dist`).
3. Environment Variable: `VITE_API_URL=https://<servis>.onrender.com/api` (build vaqtida o‘qiladi — o‘zgartirsangiz, qayta deploy qiling).
4. Deploy’dan keyin Vercel manzilini Render’dagi `CORS_ORIGIN` ga yozing va backendni qayta ishga tushiring.

[vercel.json](code/frontend/vercel.json) barcha marshrutlarni `index.html` ga yo‘naltiradi — `/savatcha` kabi sahifalar yangilanganda 404 bermaydi.

## Ko‘p uchraydigan muammolar

| Belgi | Sabab va yechim |
|-------|-----------------|
| `password authentication failed` | `.env` dagi `DB_PASSWORD` yoki `DATABASE_URL` paroli noto‘g‘ri |
| `ECONNREFUSED ...5432` | Lokal PostgreSQL ishlamayapti (Windows: Services → postgresql → Start) |
| `ENOTFOUND` / `ENETUNREACH` (Supabase) | To‘g‘ridan-to‘g‘ri ulanish o‘rniga **Session pooler** manzilini ishlating |
| `JWT_SECRET o'rnatilmagan` | `NODE_ENV=production` da `JWT_SECRET` majburiy |
| Brauzerda CORS xatosi | Backenddagi `CORS_ORIGIN` frontend manzili bilan aynan mos emas (oxirida `/` bo‘lmasin) |
| Frontend: "Serverga ulanib bo‘lmadi" | Backend ishga tushmagan yoki `VITE_API_URL` noto‘g‘ri |
| `429 So'rovlar juda ko'p` | Rate-limit; 15 daqiqa kuting yoki backendni qayta ishga tushiring (lokalda) |

## Git

Asosiy tarmoq `master`. O‘zgarishlarni alohida tarmoqda bajaring va kichik, mazmunli commitlar qiling.

## AI agenti bilan ishlash

Claude Code yangi suhbatni boshlaganda [CLAUDE.md](CLAUDE.md) ko‘rsatmalariga amal qilib, loyiha holati haqida qisqa hisobot beradi.
