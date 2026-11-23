# Qurilishdo‘koni

Qurilish va sanoat materiallari uchun o‘quv internet-do‘kon (MVP).

Mijoz **ro‘yxatdan o‘tmaydi**: katalogdan mahsulot topadi, savatchaga qo‘shadi va buyurtma berayotganda ismi, telefoni va manzilini kiritadi.
Xodimlar alohida **panelda** (`/panel`, username + parol) o‘z huquqlari doirasida buyurtma, mahsulot va kategoriyalarni boshqaradi.
Talablar: [docs/umumiy/](docs/umumiy/).

## Imkoniyatlar

| Kim | Nima qila oladi |
|-----|-----------------|
| Mijoz (akkauntsiz) | Katalog, kategoriya filtri, qidiruv, mahsulot sahifasi, savatcha (brauzerda), buyurtma berish (captcha bilan) |
| Menejer | Faqat role’iga berilgan huquqlar: buyurtmalar, mahsulotlar, kategoriyalar (ko‘rish / qo‘shish / tahrirlash / o‘chirish / arxivlash / tasdiqlash) |
| Direktor | Barcha bo‘limlar + menejerlar va ularning huquqlarini boshqarish |
| Administrator | Hammasi + barcha turdagi xodim va role’lar, kirish urinishlari jurnali |

## Texnologiyalar

| Qatlam   | Texnologiya | Papka |
|----------|-------------|-------|
| Frontend | React 18 + Vite, react-router, oddiy CSS | [code/frontend/](code/frontend/) |
| Backend  | Node.js + Express, JWT, bcryptjs, svg-captcha, helmet, express-rate-limit | [code/backend/](code/backend/) |
| Baza     | PostgreSQL (lokal yoki Supabase) | [code/database/](code/database/) |
| Testlar  | `node:test` + supertest | [code/backend/test/](code/backend/test/) |

```
Brauzer (React)  ──HTTP/JSON (+ Bearer xodim uchun)──▶  Express REST API  ──SQL──▶  PostgreSQL
   :5173 / Vercel              /api/...                   :5000 / Render             lokal / Supabase
```

## Loyiha tuzilmasi

```
code/
├── database/
│   ├── schema/001_schema.sql        # asosiy jadvallar (db:init noldan quradi)
│   ├── seed/001_seed.sql            # 8 kategoriya, 29 mahsulot, namunaviy buyurtma
│   └── migrations/
│       ├── 002_auth_rbac.sql         # role turlari, pages/accesses, sessiyalar, captcha, RLS
│       └── 003_username_password.sql # username + parol, must_change_password, token_version
├── backend/
│   ├── scripts/
│   │   ├── db-init.js       # noldan: sxema + seed + migratsiyalar + admin (npm run db:init)
│   │   ├── db-migrate.js    # faqat yangi migratsiyalar, hech narsa o'chirmaydi (npm run db:migrate)
│   │   ├── seed-admin.js    # boshlang'ich admin (npm run db:seed-admin)
│   │   └── smoke-test.js    # ishlab turgan API'ni tez tekshirish (npm run test:smoke)
│   ├── test/                # avtomatik testlar (npm test)
│   └── src/
│       ├── app.js, server.js           # server.js majburiy env'larni tekshiradi
│       ├── config/                     # db.js (DATABASE_URL + SSL), env.js
│       ├── utils/                      # password.js, tokens.js, captcha.js, httpError.js
│       ├── api/
│       │   ├── middleware/   # authenticate, requireAccess, requireRoleType, rateLimits, asyncHandler, errorHandler
│       │   ├── routes/       # auth, catalog, orders (ochiq), admin + crud + meta (panel), management
│       │   └── validators/
│       ├── services/crud.service.js    # umumiy CRUD: sahifalash, qidiruv, filtr
│       └── modules/
│           ├── registry.js   # panel CRUD resurslari va ularning sahifa kodlari
│           └── auth/ users/ roles/ accesses/ loginAttempts/ catalog/ orders/
└── frontend/
    ├── vercel.json                     # SPA marshrutlari uchun rewrite
    └── src/
        ├── pages/            # Catalog, Product, Cart (ochiq); panel/* va admin/* (xodimlar); 403, 404
        ├── components/       # layout (Public/Panel), auth (ProtectedRoute, Can), forms (Captcha), shop, tables, modals
        ├── context/          # Auth, Cart (localStorage), Toast
        └── services/api.js   # barcha HTTP so'rovlar, tokenlar va refresh navbati
docs/umumiy/                  # MVP talablari va qarorlar
render.yaml                   # Render Blueprint (backend)
```

## Lokal ishga tushirish

Kerak: **Node.js 20+** (`npm test` uchun 22+) va **PostgreSQL 14+** (yoki Supabase loyihasi).

### 1. Backend + baza

```bash
cd code/backend
npm install
copy .env.example .env        # Mac/Linux: cp .env.example .env
```

`.env` ni to‘ldiring (pastdagi jadvalga qarang). **Majburiy**: `JWT_ACCESS_SECRET` va `CAPTCHA_SECRET` —
ikkita har xil uzun tasodifiy qator. Har birini shu buyruq bilan yarating:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keyin:

```bash
npm run db:init               # YANGI baza: jadvallar + namunaviy ma'lumotlar + migratsiyalar + admin
npm run dev                   # API: http://localhost:5000/api
```

`db:init` oxirida admin username’ini (va `ADMIN_INITIAL_PASSWORD` bo‘sh bo‘lsa — vaqtinchalik parolini) chiqaradi (pastda: [Birinchi admin bilan kirish](#birinchi-admin-bilan-kirish)).
Tekshirish: http://localhost:5000/api/health → `{"status":"ok","db":"connected"}`

> ⚠️ `npm run db:init` mavjud jadvallarni **o‘chirib, qaytadan** yaratadi. Ma’lumoti bor bazani yangilash uchun
> faqat `npm run db:migrate` ishlating. `NODE_ENV=production` da `db:init` `--force` siz ishlamaydi.

### 2. Frontend (yangi terminalda)

```bash
cd code/frontend
npm install
npm run dev                   # http://localhost:5173  (panel: http://localhost:5173/panel/login)
```

Lokalda `VITE_API_URL` bo‘sh qoladi: `/api` so‘rovlari vite proxy orqali `localhost:5000` ga boradi.
Backend boshqa portda bo‘lsa: `VITE_PROXY_TARGET=http://localhost:5001 npm run dev`.

### 3. Tekshirish

```bash
cd code/backend
npm test                      # 31 ta test: login, parol siyosati, captcha, qulf, sessiya, RBAC, ierarxiya, seed, ochiq buyurtma
npm run test:smoke            # ishlab turgan API (standart localhost:5000) — bazaga yozmaydi
```

`npm test` alohida **`qurilish_dokoni_test`** bazasini har safar noldan quradi. `.env` dagi `DATABASE_URL`
testda **hech qachon** ishlatilmaydi (Supabase bazangiz tasodifan tozalanmasligi uchun).
Boshqa API’ni tekshirish: `API_URL=https://.../api npm run test:smoke`.

## `.env` sozlamalari

**Backend** (`code/backend/.env`, namunasi: [.env.example](code/backend/.env.example)):

| O‘zgaruvchi | Majburiy | Izoh |
|-------------|----------|------|
| `JWT_ACCESS_SECRET` | **ha** | Access token imzosi, kamida 32 bayt. Eski nomi `JWT_SECRET` ham o‘qiladi |
| `CAPTCHA_SECRET` | **ha** | Captcha javobining HMAC kaliti, kamida 32 bayt, `JWT_ACCESS_SECRET` dan farqli |
| `DATABASE_URL` | production’da ha | To‘liq ulanish manzili (Supabase Session pooler). Berilsa, `DB_*` e’tiborga olinmaydi |
| `FRONTEND_URL` | production’da ha | CORS: frontend manzili; bir nechtasi vergul bilan (Vercel preview). Eski nomi `CORS_ORIGIN` ham o‘qiladi |
| `ADMIN_USERNAME` | yo‘q | Boshlang‘ich admin username’i (standart `admin`) |
| `ADMIN_INITIAL_PASSWORD` | yo‘q | Boshlang‘ich admin vaqtinchalik paroli. Bo‘sh bo‘lsa — generatsiya qilinib bir marta chiqariladi. Ishlatib bo‘lgach o‘chiring |
| `DB_SSL` | yo‘q | `true`/`false`. Bo‘sh bo‘lsa: manzilda `supabase` bo‘lsa SSL yoqiladi |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | lokalda | `DATABASE_URL` bo‘lmasa ishlatiladi |
| `NODE_ENV` | yo‘q | `production` |
| `PORT` | yo‘q | Standart `5000` (Render o‘zi beradi) |

Majburiy qiymat yetishmasa server ishga tushmaydi va nima yetishmayotganini aniq yozadi.

**Frontend** (`code/frontend/.env`, faqat deploy uchun):

| O‘zgaruvchi | Izoh |
|-------------|------|
| `VITE_API_URL` | Backend manzili, masalan `https://qurilishdokoni-api.onrender.com/api`. Lokalda bo‘sh. Brauzerga ochiq ketadi — maxfiy narsa yozmang |

## REST API

Barcha javoblar JSON. Panel so‘rovlarida header: `Authorization: Bearer <accessToken>`.

### Ochiq (mijoz, login yo‘q)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| GET  | `/api/health` | server va baza holati |
| GET  | `/api/categories` | faol kategoriyalar va mahsulotlar soni |
| GET  | `/api/products` | `?search=&category_id=&sort=id\|name\|price&order=asc\|desc&page=1&limit=12` |
| GET  | `/api/products/:id` | bitta mahsulot |
| GET  | `/api/auth/captcha` | `{ captchaId, svg }` |
| POST | `/api/orders` | `{ customer_name, phone, address, note?, items: [{ product_id, quantity }], captchaId, captchaAnswer }` |

Katalogda faqat faol kategoriyadagi faol mahsulotlar va faqat mijozga kerakli maydonlar qaytadi.
Buyurtma **bitta tranzaksiyada**: mahsulot qatorlari qulflanadi (`FOR UPDATE`), narx va nom **bazadan** olinadi
(mijoz yuborgan narxga ishonilmaydi), qoldiq tekshiriladi va kamaytiriladi. Yetmasa — `409 OUT_OF_STOCK`.

### Kirish (xodim)

| Metod | Manzil | Tavsif |
|-------|--------|--------|
| POST | `/api/auth/login` | `{ username, password, captchaId?, captchaAnswer? }` → `{ accessToken, refreshToken, mustChangePassword, user }` |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` → yangi token juftligi (boshqa sessiyalar yopiladi) |
| POST | `/api/auth/refresh` | `{ refreshToken }` → yangi juftlik (eski refresh bekor bo‘ladi) |
| POST | `/api/auth/logout` | `{ refreshToken }` → `204` |
| GET  | `/api/auth/me` | `{ id, fullName, username, role: { id, name, type }, fullAccess, accesses, mustChangePassword }` |

`mustChangePassword: true` (vaqtinchalik parol) bo‘lsa faqat `/auth/me`, `/auth/change-password`, `/auth/logout` ishlaydi,
qolgan panel endpointlari `403 PASSWORD_CHANGE_REQUIRED` qaytaradi.

### Panel (access bo‘yicha)

| Metod | Manzil | Huquq |
|-------|--------|-------|
| GET    | `/api/admin/meta` | login |
| GET    | `/api/admin/orders` | `ORDER_VIEW` |
| PATCH  | `/api/admin/orders/:id/status` | `{ status }`: `confirmed` → `ORDER_APPROVE`, boshqasi → `ORDER_UPDATE` |
| GET    | `/api/admin/:resource`, `/:id` | `PRODUCT_VIEW` / `CATEGORY_VIEW` |
| GET    | `/api/admin/:resource/options` | shu resurs yoki unga bog‘langan resurs huquqi |
| POST   | `/api/admin/:resource` | `*_CREATE` |
| PUT    | `/api/admin/:resource/:id` | `*_UPDATE`; `status` o‘zgarsa qo‘shimcha `*_ARCHIVE` |
| DELETE | `/api/admin/:resource/:id` | `*_DELETE` |

### Boshqaruv

| Metod | Manzil | Kim |
|-------|--------|-----|
| GET / POST | `/api/users` | ADMIN, DIRECTOR. POST `{ username, fullName, roleId, password? }` → `{ user, temporaryPassword? }` (parol berilmasa server generatsiya qiladi) |
| PATCH | `/api/users/:id` | ADMIN, DIRECTOR |
| PATCH | `/api/users/:id/status` | ADMIN, DIRECTOR. `{ isActive }` |
| POST  | `/api/users/:id/reset-password` | ADMIN, DIRECTOR (ierarxiya bo‘yicha). `{ password? }` → `{ user, temporaryPassword }` |
| GET / POST / PUT / DELETE | `/api/roles[/:id]` | ADMIN, DIRECTOR |
| PUT   | `/api/roles/:id/accesses` | ADMIN, DIRECTOR. `{ accessIds: [] }`, tranzaksiyada |
| GET   | `/api/accesses` | ADMIN, DIRECTOR (sahifalar bo‘yicha guruhlangan) |
| GET   | `/api/login-attempts` | faqat ADMIN. `?page=&limit=&username=&ip=&success=&reason=` |

Buyurtma holatlari: `new → confirmed → shipped → delivered`; `delivered` dan oldin istalgan bosqichda `cancelled`
(qoldiq qaytariladi).

### Javob va xatolar

```json
{ "data": [ ... ], "total": 29, "page": 1, "limit": 12, "pages": 3 }
{ "error": { "code": "VALIDATION_ERROR", "message": "Ma'lumotlar noto'g'ri to'ldirilgan", "details": { "phone": "..." } } }
{ "error": { "code": "FORBIDDEN", "message": "Bu amal uchun sizda huquq yo'q", "requiredAccess": ["PRODUCT_DELETE"] } }
```

Asosiy kodlar: `VALIDATION_ERROR`, `WEAK_PASSWORD`, `INVALID_CURRENT_PASSWORD`, `PASSWORD_CHANGE_REQUIRED`, `TOKEN_REVOKED`, `CAPTCHA_REQUIRED`, `CAPTCHA_INVALID`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`
(`retryAfterSeconds` bilan, HTTP 423), `TOKEN_EXPIRED`, `REFRESH_REUSED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE`,
`LAST_ADMIN`, `OUT_OF_STOCK`, `TOO_MANY_REQUESTS`. Production’da stack trace va bazaning ichki tafsilotlari qaytmaydi.

## Xavfsizlik va huquqlar

### Migration va seed

**Lokal, yangi baza** — `npm run db:init` (sxema → seed → migratsiyalar → admin).

**Lokal yoki Supabase, ma’lumoti bor baza** (masalan oldingi versiyadan yangilash):

```bash
cd code/backend
npm run db:migrate            # faqat hali bajarilmagan migrations/*.sql — hech narsa o'chirmaydi
npm run db:seed-admin         # ADMIN_USERNAME bilan xodim yo'q bo'lsa — yaratadi
```

Supabase uchun ikkinchi yo‘l: **SQL Editor** da hali bajarilmagan fayllarni tartib bilan to‘liq bajaring —
[002_auth_rbac.sql](code/database/migrations/002_auth_rbac.sql), keyin [003_username_password.sql](code/database/migrations/003_username_password.sql).
003 idempotent; 002 esa 003 dan keyin qayta bajarilsa, hech narsa o‘zgartirmasdan xato bilan to‘xtaydi (himoya).
Admin’ni kompyuteringizdan `DATABASE_URL` bilan `npm run db:seed-admin` orqali yarating — ochiq parol SQL faylda
saqlanmaydi, bazaga faqat bcrypt hash yoziladi.

Render har ishga tushishda `npm run db:migrate` va `npm run db:seed-admin -- --only-with-env` ni bajaradi
([render.yaml](render.yaml)): admin faqat `ADMIN_INITIAL_PASSWORD` berilgan bo‘lsa yaratiladi, parol logga chiqmaydi.

**002 → 003 yangilanishi (oldingi “login + kod” versiyasidan):** `login` → `username` (kichik harfga o‘tkaziladi;
ruxsat etilmagan belgilar `_` ga almashtirilib, oxiriga id qo‘shiladi, masalan `Bosh-Admin` → `bosh_admin_3`).
Mavjud xodimlar **eski kodini vaqtinchalik parol** sifatida ishlatadi — tiresiz, katta harflarda (`ABCD-2345` → `ABCD2345`) —
va birinchi kirishda yangi parol o‘rnatadi. Eski mijoz akkauntlarining parol hashlari `legacy_password_hash` da saqlanadi.

Migratsiya eski ma’lumotni o‘chirmaydi: eski email/parolli akkauntlar nofaol bo‘lib qoladi (panelga kira olmaydi),
buyurtmalardagi mijoz ismi `orders.customer_name` ga ko‘chiriladi. Hamma jadvallarda **RLS** yoqiladi — Supabase’ning
anon kalitli REST API’si orqali jadvallarni o‘qib/yozib bo‘lmaydi (backend jadval egasi sifatida ishlaydi, unga ta’sir qilmaydi).

### Birinchi admin bilan kirish

1. `ADMIN_USERNAME` (standart `admin`) va ixtiyoriy `ADMIN_INITIAL_PASSWORD` ni `.env` ga yozing.
   Parol bo‘sh bo‘lsa, `db:seed-admin` / `db:init` tasodifiy 12 belgili parol yaratib, uni **faqat bir marta** konsolga chiqaradi.
2. Saytda **Kirish** → `/panel/login` → username va vaqtinchalik parol.
3. Panel sizni **Parolni o‘zgartirish** sahifasiga olib boradi — o‘z parolingizni o‘rnating (shundan keyin boshqa bo‘limlar ochiladi).
4. `.env` / Render’dan `ADMIN_INITIAL_PASSWORD` ni o‘chirib qo‘ying.

Admin parolini unutsangiz: boshqa ADMIN “Parolni tiklash” qiladi. Yagona admin bo‘lsa — serverda/kompyuteringizda
`npm run db:seed-admin -- --reset` (parol `ADMIN_INITIAL_PASSWORD` dan yoki generatsiya qilinadi; barcha sessiyalar yopiladi,
qulf olinadi, birinchi kirishda yana parol o‘zgartiriladi).

### Role turlari va ierarxiya

| Turi | Huquq | Kimni boshqaradi |
|------|-------|------------------|
| `ADMIN` | to‘liq (access tekshirilmaydi) | barcha turdagi role va xodimlar; kirish jurnali |
| `DIRECTOR` | to‘liq (access tekshirilmaydi) | faqat `MANAGER` role va xodimlari |
| `MANAGER` | faqat role’iga berilgan access’lar | hech kimni (boshqaruv API → `403`) |

Qoidalar **service qatlamida** majburiy tekshiriladi (frontend faqat yashiradi):
DIRECTOR ADMIN/DIRECTOR yarata olmaydi, o‘zgartira olmaydi va xodimni MANAGER’dan yuqoriga ko‘tara olmaydi;
hech kim o‘zini bloklay olmaydi va o‘z role’ini o‘zgartira olmaydi; oxirgi faol ADMIN bloklanmaydi va ADMIN’likdan chiqmaydi.
Access’lar tokenga yozilmaydi — har so‘rovda bazadan olinadi, shuning uchun o‘zgarish qayta login’siz darhol kuchga kiradi.

### Kirish va sessiya

- **Username**: 3–32 belgi, `a-z 0-9 _ .`, katta-kichik harfga sezgir emas (kichik harfda saqlanadi).
- **Parol siyosati** (backend’da majburiy, frontend’da jonli ko‘rsatiladi): kamida 8 belgi, kamida 1 harf va 1 raqam,
  ko‘pi bilan 72 bayt (bcrypt chegarasi), username bilan bir xil emas → aks holda `400 WEAK_PASSWORD`.
  Bazada faqat bcrypt (cost 12).
- **Vaqtinchalik parol**: xodim yaratilganda yoki “Parolni tiklash” da (kiritiladi yoki 12 belgili generatsiya,
  `crypto.randomInt`, javobda faqat bir marta). `must_change_password = true` — kirish mumkin, lekin parol
  o‘zgartirilmaguncha panel `403 PASSWORD_CHANGE_REQUIRED` qaytaradi.
- **Parolni o‘zgartirish**: joriy parol tekshiriladi, yangisi eskisidan farqli bo‘lishi shart. Muvaffaqiyatda `token_version++`,
  barcha refresh tokenlar bekor, joriy qurilmaga yangi juftlik beriladi.
- **Login**: user topilmasa ham bcrypt bilan solishtiriladi (vaqt bo‘yicha username borligini bilib bo‘lmaydi), xabar doim
  “Username yoki parol noto‘g‘ri”. 5 ta ketma-ket xato → 15 daqiqa qulf. Shu username yoki IP’dan 15 daqiqada ≥3 xato →
  captcha majburiy. Har urinish `login_attempts` ga yoziladi.
- **Captcha**: o‘zimizniki (`svg-captcha`), javob `HMAC-SHA256(CAPTCHA_SECRET)` bilan, 2 daqiqa, bir martalik. Ochiq buyurtma formasida har doim.
- **Tokenlar**: access JWT HS256 15 daqiqa (`{ sub, rt, tv }`), refresh 48 bayt tasodifiy, bazada sha256, 7 kun, har refresh’da rotatsiya.
  `tv` — `users.token_version`: parol o‘zgarsa yoki tiklansa versiya oshadi va **eski access tokenlar darhol** `401 TOKEN_REVOKED`.
  Bekor qilingan refresh qayta kelsa — o‘g‘irlik belgisi, xodimning barcha sessiyalari yopiladi.
  Bloklangan xodimning amaldagi access tokeni ham darhol `401`.
- **Rate-limit (IP)**: `/api` 300, login 20, captcha 30, refresh 60, ochiq buyurtma 10 — har biri 15 daqiqada.
- **Frontend**: tokenlar `localStorage` da (frontend va backend turli domenda). `dangerouslySetInnerHTML` ishlatilmaydi,
  captcha SVG `<img src="data:...">` orqali. 401 → bitta umumiy refresh (tablar orasida ham navbat).
- Muddati o‘tgan captcha, refresh token va 90 kundan eski kirish jurnali har 10 daqiqada tozalanadi.

### Yangi sahifa yoki amal qo‘shish

1. **Baza** — yangi migratsiya fayli `code/database/migrations/004_<nom>.sql` (idempotent):
   ```sql
   INSERT INTO pages (code, name, sort_order) VALUES ('SUPPLIER', 'Yetkazib beruvchilar', 4) ON CONFLICT (code) DO NOTHING;
   INSERT INTO accesses (page_id, action, code)
   SELECT p.id, a.action, p.code || '_' || a.action
   FROM (VALUES ('VIEW'), ('CREATE'), ('UPDATE')) AS a(action) JOIN pages p ON p.code = 'SUPPLIER'
   ON CONFLICT (code) DO NOTHING;
   ```
   Keyin `npm run db:migrate`.
2. **Backend** — marshrutga `authenticate` + `requireAccess('SUPPLIER_VIEW')` (POST → `_CREATE`, PUT/PATCH → `_UPDATE`,
   DELETE → `_DELETE`, arxivlash → `_ARCHIVE`, tasdiqlash → `_APPROVE`). Oddiy CRUD bo‘lsa — `registry.js` ga `page: 'SUPPLIER'` bilan resurs qo‘shish kifoya.
3. **Frontend** — [App.jsx](code/frontend/src/App.jsx) da `<ProtectedRoute access="SUPPLIER_VIEW">`, [PanelLayout.jsx](code/frontend/src/components/layout/PanelLayout.jsx)
   dagi `PANEL_MENU` ga qator, har bir tugmani `<Can access="SUPPLIER_CREATE">…</Can>` ichiga oling.
4. **Test** — [test/auth.test.js](code/backend/test/auth.test.js) ga access’siz `403` / access bilan `200` tekshiruvi.

## Deploy: Supabase + Render + Vercel

### 1. Baza — Supabase

1. https://supabase.com da yangi loyiha yarating, baza parolini saqlang.
2. **Connect** → **Session pooler** URI’ni oling (Render IPv4 ishlatadi, to‘g‘ridan-to‘g‘ri ulanish manzili IPv6 — ishlamasligi mumkin):
   `postgresql://postgres.<ref>:<PAROL>@aws-0-<region>.pooler.supabase.com:5432/postgres`
3. Jadvallar — ikki yo‘ldan biri:
   - **yangi** baza: kompyuteringizda `code/backend/.env` ga shu `DATABASE_URL` ni yozing va `npm run db:init`;
   - **mavjud** baza (oldingi versiya): `npm run db:migrate` (yoki SQL Editor’da `002_auth_rbac.sql`).
4. Admin: `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD` bilan kompyuteringizdan `npm run db:seed-admin`
   (yoki Render’da `ADMIN_INITIAL_PASSWORD` ni birinchi deploy uchun kiriting).
   Ishingiz tugagach `.env` dagi Supabase `DATABASE_URL` ni o‘chirib qo‘ying.

### 2. Backend — Render

1. https://render.com → **New → Blueprint** → shu GitHub repozitoriyni tanlang ([render.yaml](render.yaml) o‘qiladi).
   Qo‘lda yaratsangiz: **Web Service**, Root Directory `code/backend`, Build `npm ci --omit=dev`,
   Start `npm run db:migrate && npm start`, Health check `/api/health`.
2. Environment (qo‘lda kiritiladiganlar):
   - `DATABASE_URL` — Supabase Session pooler;
   - `FRONTEND_URL` — Vercel manzili (3-qadamdan keyin), oxirida `/` siz;
   - `JWT_ACCESS_SECRET`, `CAPTCHA_SECRET` — Blueprint o‘zi yaratadi (qo‘lda yaratsangiz — ikkita har xil uzun qator);
   - `NODE_ENV=production`.
3. Tekshirish: `https://<servis>.onrender.com/api/health`.
   Bepul tarifda servis 15 daqiqa so‘rov bo‘lmasa uxlaydi — birinchi so‘rov ~1 daqiqa kechikishi mumkin.

### 3. Frontend — Vercel

1. https://vercel.com → **Add New → Project** → repozitoriyni tanlang.
2. **Root Directory**: `code/frontend` (Framework: Vite, Build: `npm run build`, Output: `dist`).
3. Environment Variable: `VITE_API_URL=https://<servis>.onrender.com/api` (build vaqtida o‘qiladi — o‘zgartirsangiz, qayta deploy qiling).
4. Deploy’dan keyin Vercel manzilini Render’dagi `FRONTEND_URL` ga yozing va backendni qayta ishga tushiring.

[vercel.json](code/frontend/vercel.json) barcha marshrutlarni `index.html` ga yo‘naltiradi — `/panel/users` kabi sahifalar yangilanganda 404 bermaydi.

## Ko‘p uchraydigan muammolar

| Belgi | Sabab va yechim |
|-------|-----------------|
| `Server ishga tushmadi — sozlamalar yetarli emas` | Xabarda ko‘rsatilgan env’ni qo‘shing (`JWT_ACCESS_SECRET`, `CAPTCHA_SECRET`, production’da `DATABASE_URL`, `FRONTEND_URL`) |
| `password authentication failed` | `.env` dagi `DB_PASSWORD` yoki `DATABASE_URL` paroli noto‘g‘ri |
| `ECONNREFUSED ...5432` | Lokal PostgreSQL ishlamayapti (Windows: Services → postgresql → Start) |
| `ENOTFOUND` / `ENETUNREACH` (Supabase) | To‘g‘ridan-to‘g‘ri ulanish o‘rniga **Session pooler** manzilini ishlating |
| Brauzerda CORS xatosi | Backenddagi `FRONTEND_URL` frontend manzili bilan aynan mos emas |
| Admin paroli esdan chiqdi | Boshqa ADMIN “Parolni tiklash” qiladi. Yagona admin bo‘lsa: `npm run db:seed-admin -- --reset` |
| `403 PASSWORD_CHANGE_REQUIRED` | Vaqtinchalik parol bilan kirilgan — avval `/panel/change-password` da parolni o‘zgartiring |
| `Akkaunt vaqtincha bloklangan` | 15 daqiqa kuting yoki ADMIN/DIRECTOR xodimni “Faollashtirish” qiladi (qulf olinadi) |
| Frontend: "Serverga ulanib bo‘lmadi" | Backend ishga tushmagan yoki `VITE_API_URL` noto‘g‘ri |
| `429 So'rovlar juda ko'p` | Rate-limit; 15 daqiqa kuting |

## Git

Asosiy tarmoq `master`. O‘zgarishlarni alohida tarmoqda bajaring va kichik, mazmunli commitlar qiling.

## AI agenti bilan ishlash

Claude Code yangi suhbatni boshlaganda [CLAUDE.md](CLAUDE.md) ko‘rsatmalariga amal qilib, loyiha holati haqida qisqa hisobot beradi.
