-- =============================================================
-- Qurilishdo'koni — PostgreSQL sxemasi (internet-do'kon MVP)
-- 7 ta jadval: roles, users, categories, products, cart_items, orders, order_items
-- Ishga tushirish: code/backend ichida  npm run db:init
-- =============================================================

-- Qayta ishga tushirilsa, eski jadvallarni o'chiradi (faqat o'quv loyiha uchun!).
-- Ro'yxatda avvalgi ombor versiyasining jadvallari ham bor — eski bazani tozalash uchun.
DROP TABLE IF EXISTS
  order_items, orders, cart_items, products, categories, users, roles,
  settings, debts, payments, sale_items, sales, inventory_movements, customers, suppliers
CASCADE;

-- 1. Rollar: faqat 'admin' va 'user'
CREATE TABLE roles (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('admin', 'user')),
  description  TEXT
);

-- 2. Foydalanuvchilar
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  full_name      VARCHAR(150) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  phone          VARCHAR(30),
  password_hash  VARCHAR(255) NOT NULL,
  role_id        INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Kategoriyalar
CREATE TABLE categories (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE,
  description  TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. Mahsulotlar (stock_quantity — sotuvdagi qoldiq, buyurtmada kamayadi)
CREATE TABLE products (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(150)  NOT NULL,
  category_id     INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sku             VARCHAR(50)   UNIQUE,
  description     TEXT,
  unit            VARCHAR(20)   NOT NULL DEFAULT 'dona',
  price           NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  stock_quantity  INT           NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url       TEXT,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 5. Savatcha: har bir foydalanuvchida bitta mahsulot bitta qatorda
CREATE TABLE cart_items (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- 6. Buyurtmalar
CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status        VARCHAR(20)   NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  phone         VARCHAR(30)   NOT NULL,
  address       TEXT          NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 7. Buyurtma qatorlari. Nom va narx buyurtma paytidagi holatda saqlanadi,
-- shuning uchun keyin mahsulot narxi o'zgarsa ham eski buyurtma summasi o'zgarmaydi.
CREATE TABLE order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INT REFERENCES products(id) ON DELETE SET NULL,
  product_name  VARCHAR(150)  NOT NULL,
  unit          VARCHAR(20)   NOT NULL,
  unit_price    NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  quantity      INT           NOT NULL CHECK (quantity > 0),
  total_price   NUMERIC(14,2) NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_name      ON products(LOWER(name));
CREATE INDEX idx_cart_items_user    ON cart_items(user_id);
CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
