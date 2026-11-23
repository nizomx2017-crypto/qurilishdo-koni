-- =============================================================
-- 002 — Xodimlar paneli: login + kod, role turlari va access'lar (RBAC)
--
-- Idempotent: qayta ishga tushirilsa xato bermaydi va mavjud ma'lumotni buzmaydi.
-- Ishga tushirish:  code/backend ichida  npm run db:migrate
--   yoki Supabase -> SQL Editor da shu faylni to'liq bajaring.
--
-- Hech qanday ma'lumot o'chirilmaydi:
--   * eski mijoz akkauntlari (login'siz) nofaol holatda qoladi, panelga kira olmaydi;
--   * buyurtmadagi mijoz ismi orders.customer_name ga nusxalanadi;
--   * eski ustunlar (email, password_hash, status) saqlanadi, yangi kod ularni ishlatmaydi.
-- Boshlang'ich admin bu yerda YARATILMAYDI (ochiq kod SQL'da bo'lmasligi uchun):
--   npm run db:seed-admin  (ADMIN_LOGIN / ADMIN_INITIAL_CODE env'dan)
-- =============================================================

BEGIN;

-- ------------------------------------------------------------- roles
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(50);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS type VARCHAR(20);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE roles SET type = 'ADMIN' WHERE name = 'admin' AND type IS NULL;
UPDATE roles SET type = 'MANAGER', name = 'Mijoz (eski akkaunt)',
                 description = 'Eski mijoz akkauntlari. Huquqi yo''q, panelga kira olmaydi'
 WHERE name = 'user' AND type IS NULL;
UPDATE roles SET type = 'MANAGER' WHERE type IS NULL;
ALTER TABLE roles ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_type_check') THEN
    ALTER TABLE roles ADD CONSTRAINT roles_type_check CHECK (type IN ('ADMIN', 'DIRECTOR', 'MANAGER'));
  END IF;
END $$;

INSERT INTO roles (name, type, description) VALUES
  ('Direktor', 'DIRECTOR', 'Menejerlar va ularning huquqlarini boshqaradi, barcha bo''limlarga kiradi'),
  ('Menejer',  'MANAGER',  'Faqat direktor yoki admin bergan huquqlar doirasida ishlaydi')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS login           VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS code_hash       VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active       BOOLEAN     NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INT         NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by      INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Eski email/parol ustunlari endi majburiy emas (xodim faqat login + kod bilan yaratiladi)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Kodi yo'q (eski email/parolli) akkauntlar kira olmaydi
UPDATE users SET is_active = FALSE WHERE code_hash IS NULL AND is_active;

CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_uq ON users (LOWER(login));

-- ------------------------------------------------------------- orders: mijoz akkauntsiz buyurtma beradi
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
UPDATE orders o SET customer_name = u.full_name FROM users u
 WHERE u.id = o.user_id AND o.customer_name IS NULL;
UPDATE orders SET customer_name = '—' WHERE customer_name IS NULL;
ALTER TABLE orders ALTER COLUMN customer_name SET NOT NULL;
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------- pages / accesses
CREATE TABLE IF NOT EXISTS pages (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accesses (
  id       SERIAL PRIMARY KEY,
  page_id  INT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  action   VARCHAR(20) NOT NULL
           CHECK (action IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'APPROVE')),
  code     VARCHAR(80) NOT NULL UNIQUE,
  UNIQUE (page_id, action)
);

CREATE TABLE IF NOT EXISTS role_accesses (
  role_id    INT NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
  access_id  INT NOT NULL REFERENCES accesses(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, access_id)
);

-- ------------------------------------------------------------- sessiyalar va himoya
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   CHAR(64) NOT NULL UNIQUE,         -- sha256(hex); ochiq token bazada saqlanmaydi
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  replaced_by  INT REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent   VARCHAR(300),
  ip           VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS captchas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_hash  CHAR(64) NOT NULL,                -- HMAC-SHA256(CAPTCHA_SECRET, javob)
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id          BIGSERIAL PRIMARY KEY,
  login       VARCHAR(100),
  ip          VARCHAR(64),
  success     BOOLEAN NOT NULL,
  reason      VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_login ON login_attempts(LOWER(login), created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip    ON login_attempts(ip, created_at);

-- ------------------------------------------------------------- seed: sahifalar va amallar
INSERT INTO pages (code, name, sort_order) VALUES
  ('ORDER',    'Buyurtmalar',   1),
  ('PRODUCT',  'Mahsulotlar',   2),
  ('CATEGORY', 'Kategoriyalar', 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO accesses (page_id, action, code)
SELECT p.id, a.action, p.code || '_' || a.action
FROM (VALUES
  ('ORDER', 'VIEW'), ('ORDER', 'UPDATE'), ('ORDER', 'APPROVE'),
  ('PRODUCT', 'VIEW'), ('PRODUCT', 'CREATE'), ('PRODUCT', 'UPDATE'), ('PRODUCT', 'DELETE'), ('PRODUCT', 'ARCHIVE'),
  ('CATEGORY', 'VIEW'), ('CATEGORY', 'CREATE'), ('CATEGORY', 'UPDATE'), ('CATEGORY', 'DELETE'), ('CATEGORY', 'ARCHIVE')
) AS a(page, action)
JOIN pages p ON p.code = a.page
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------- Supabase himoyasi
-- Supabase public sxemani anon kalit bilan REST API orqali ochadi. RLS yoqilib, policy
-- yozilmasa, u yo'l bilan hech kim o'qiy/yoza olmaydi. Backend jadval egasi sifatida
-- ulanadi, egaga RLS ta'sir qilmaydi — ilova odatdagidek ishlaydi.
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE accesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_accesses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE captchas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

COMMIT;
