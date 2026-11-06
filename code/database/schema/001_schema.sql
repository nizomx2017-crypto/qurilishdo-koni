-- =============================================================
-- Qurilishdo'koni — PostgreSQL sxemasi (MVP)
-- Manba: docs/06-final-mvp-structure.md, 6-bo'lim
-- Ishga tushirish:  psql -U postgres -d qurilish_dokoni -f 001_schema.sql
-- =============================================================

-- Qayta ishga tushirilsa, eski jadvallarni o'chiradi (faqat o'quv loyiha uchun!)
DROP TABLE IF EXISTS settings, debts, payments, sale_items, sales,
  inventory_movements, customers, suppliers, products, categories,
  users, roles CASCADE;

-- 1. Rollar
CREATE TABLE roles (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50)  NOT NULL UNIQUE,
  description  TEXT
);

-- 2. Foydalanuvchilar
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  full_name      VARCHAR(150) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role_id        INT REFERENCES roles(id) ON DELETE RESTRICT,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive')),
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 3. Kategoriyalar (parent_id orqali ichma-ich bo'lishi mumkin)
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  parent_id  INT REFERENCES categories(id) ON DELETE SET NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'inactive'))
);

-- 4. Mahsulotlar
CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150)  NOT NULL,
  category_id     INT REFERENCES categories(id) ON DELETE RESTRICT,
  sku             VARCHAR(50)   UNIQUE,
  unit            VARCHAR(20)   NOT NULL DEFAULT 'dona',
  purchase_price  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  sale_price      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  stock_quantity  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- 5. Yetkazib beruvchilar
CREATE TABLE suppliers (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  phone           VARCHAR(30),
  contact_person  VARCHAR(100),
  address         TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive'))
);

-- 6. Xaridorlar
CREATE TABLE customers (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(150)  NOT NULL,
  phone    VARCHAR(30),
  address  TEXT,
  balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  status   VARCHAR(20)   NOT NULL DEFAULT 'active'
           CHECK (status IN ('active', 'inactive'))
);

-- 7. Ombor harakatlari (kirim / chiqim)
CREATE TABLE inventory_movements (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type        VARCHAR(10)   NOT NULL CHECK (type IN ('in', 'out')),
  quantity    NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  reason      TEXT,
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Sotuvlar
CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,
  customer_id     INT REFERENCES customers(id) ON DELETE RESTRICT,
  user_id         INT REFERENCES users(id) ON DELETE SET NULL,
  total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status  VARCHAR(20)   NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  status          VARCHAR(20)   NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'completed', 'cancelled')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. Sotuv qatorlari (bitta sotuvda bir nechta mahsulot)
CREATE TABLE sale_items (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- 10. To'lovlar
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  sale_id         INT REFERENCES sales(id) ON DELETE SET NULL,
  customer_id     INT REFERENCES customers(id) ON DELETE SET NULL,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_method  VARCHAR(20)   NOT NULL DEFAULT 'cash'
                  CHECK (payment_method IN ('cash', 'card', 'transfer', 'debt')),
  status          VARCHAR(20)   NOT NULL DEFAULT 'completed'
                  CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 11. Qarzlar (xaridor yoki yetkazib beruvchi bilan)
CREATE TABLE debts (
  id           SERIAL PRIMARY KEY,
  customer_id  INT REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id  INT REFERENCES suppliers(id) ON DELETE SET NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status       VARCHAR(20)   NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'closed')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 12. Sozlamalar
CREATE TABLE settings (
  id           SERIAL PRIMARY KEY,
  key          VARCHAR(100) NOT NULL UNIQUE,
  value        TEXT,
  description  TEXT
);

-- Tez qidirish uchun indekslar
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_movements_product   ON inventory_movements(product_id);
CREATE INDEX idx_sales_customer      ON sales(customer_id);
CREATE INDEX idx_sale_items_sale     ON sale_items(sale_id);
CREATE INDEX idx_payments_sale       ON payments(sale_id);
