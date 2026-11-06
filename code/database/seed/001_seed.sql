-- =============================================================
-- Qurilishdo'koni — namunaviy ma'lumotlar
-- Barcha foydalanuvchilar paroli: admin123
-- =============================================================

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Barcha huquqlar'),
  ('admin',       'Ombor, mahsulot, savdo va hisobotlarni boshqaradi'),
  ('manager',     'Savdo va hisobotlarni ko''radi'),
  ('stock_manager','Kirim/chiqim va inventarizatsiya'),
  ('cashier',     'Sotuv va to''lovlarni qabul qiladi'),
  ('read_only',   'Faqat ko''rish huquqi');

INSERT INTO users (full_name, email, password_hash, role_id) VALUES
  ('Aziz Karimov',     'aziz@qurilish.uz',   '176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 1),
  ('Dilnoza Rahimova', 'dilnoza@qurilish.uz','176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 2),
  ('Bekzod Tursunov',  'bekzod@qurilish.uz', '176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 4),
  ('Malika Yusupova',  'malika@qurilish.uz', '176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 5),
  ('Sardor Aliyev',    'sardor@qurilish.uz', '176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 3);

INSERT INTO categories (name, parent_id) VALUES
  ('Qurilish materiallari', NULL),   -- 1
  ('Sement va qorishmalar', 1),      -- 2
  ('G''isht va bloklar', 1),         -- 3
  ('Metall buyumlar', NULL),         -- 4
  ('Armatura', 4),                   -- 5
  ('Bo''yoqlar', NULL),              -- 6
  ('Santexnika', NULL),              -- 7
  ('Elektr mollari', NULL),          -- 8
  ('Asboblar', NULL),                -- 9
  ('Yog''och va fanera', 1);         -- 10

INSERT INTO products (name, category_id, sku, unit, purchase_price, sale_price, stock_quantity) VALUES
  ('Sement M400 (50 kg)',          2, 'SEM-400',  'qop',   52000,  58000, 0),
  ('Sement M500 (50 kg)',          2, 'SEM-500',  'qop',   60000,  67000, 0),
  ('Shtukaturka gips (30 kg)',     2, 'GIP-30',   'qop',   45000,  52000, 0),
  ('Plitka yelimi (25 kg)',        2, 'YEL-25',   'qop',   38000,  44000, 0),
  ('Qizil g''isht',                3, 'GSH-QZL',  'dona',    900,   1100, 0),
  ('Gazoblok 600x300x200',         3, 'GZB-200',  'dona',  14000,  16500, 0),
  ('Penoblok 600x300x100',         3, 'PNB-100',  'dona',   8000,   9500, 0),
  ('Armatura 10 mm',               5, 'ARM-10',   'metr',   9500,  11000, 0),
  ('Armatura 12 mm',               5, 'ARM-12',   'metr',  13500,  15500, 0),
  ('Armatura 14 mm',               5, 'ARM-14',   'metr',  18000,  20500, 0),
  ('Profil truba 40x20',           4, 'PRF-4020', 'metr',  16000,  18500, 0),
  ('Sim to''r (rabitsa)',          4, 'RAB-01',   'rulon',180000, 210000, 0),
  ('Mix 100 mm (1 kg)',            4, 'MIX-100',  'kg',    18000,  22000, 0),
  ('Emulsiya bo''yoq oq (10 l)',   6, 'BOY-EM10', 'chelak',150000,178000, 0),
  ('Fasad bo''yog''i (20 kg)',     6, 'BOY-FS20', 'chelak',320000,365000, 0),
  ('Gruntovka (10 l)',             6, 'GRN-10',   'chelak', 95000,112000, 0),
  ('Lak PF (2.5 l)',               6, 'LAK-25',   'dona',   65000,  78000, 0),
  ('PPR truba 20 mm',              7, 'PPR-20',   'metr',   6000,   7500, 0),
  ('PPR truba 25 mm',              7, 'PPR-25',   'metr',   8500,  10500, 0),
  ('Kran sharli 1/2"',             7, 'KRN-12',   'dona',  35000,  42000, 0),
  ('Unitaz komplekt',              7, 'UNT-01',   'dona', 850000, 990000, 0),
  ('Kabel VVG 2x2.5',              8, 'KBL-225',  'metr',   9000,  11000, 0),
  ('Kabel VVG 3x2.5',              8, 'KBL-325',  'metr',  13000,  15500, 0),
  ('Rozetka ikki joyli',           8, 'RZT-02',   'dona',  22000,  28000, 0),
  ('LED lampa 12W',                8, 'LED-12',   'dona',  12000,  15000, 0),
  ('Perforator 800W',              9, 'PRF-800',  'dona', 980000,1150000, 0),
  ('Bolgarka 125 mm',              9, 'BLG-125',  'dona', 550000, 650000, 0),
  ('Shpatel to''plami',            9, 'SHP-SET',  'to''plam',45000,55000, 0),
  ('Fanera 18 mm (1.22x2.44)',    10, 'FNR-18',   'list', 260000, 299000, 0),
  ('Brus 50x50 (3 m)',            10, 'BRS-5050', 'dona',  38000,  45000, 0);

INSERT INTO suppliers (name, phone, contact_person, address) VALUES
  ('Qizilqumsement AJ',     '+998 79 223 11 22', 'Rustam Ergashev',  'Navoiy viloyati'),
  ('Ohangaron Sement',      '+998 70 501 44 55', 'Javlon Qodirov',   'Toshkent viloyati, Ohangaron'),
  ('Bekobod Metall',        '+998 70 912 33 00', 'Anvar Saidov',     'Bekobod sh.'),
  ('Color Lux MCHJ',        '+998 71 255 66 77', 'Nilufar Hamidova', 'Toshkent, Sergeli'),
  ('Aqua Pipe Trade',       '+998 90 333 22 11', 'Otabek Nazarov',   'Toshkent, Chilonzor'),
  ('Elektro Market',        '+998 93 444 55 66', 'Shahzod Umarov',   'Samarqand sh.');

INSERT INTO customers (name, phone, address) VALUES
  ('Alisher Qurilish MCHJ', '+998 90 111 22 33', 'Toshkent, Yunusobod'),
  ('Jasur Abdullayev',      '+998 91 222 33 44', 'Toshkent, Mirzo Ulug''bek'),
  ('Shohruh Remont',        '+998 93 333 44 55', 'Chirchiq sh.'),
  ('Kamola Ismoilova',      '+998 94 444 55 66', 'Toshkent, Olmazor'),
  ('Barqaror Uy MCHJ',      '+998 95 555 66 77', 'Toshkent viloyati, Zangiota'),
  ('Ulug''bek Nematov',     '+998 97 666 77 88', 'Toshkent, Yakkasaroy'),
  ('Mega Build Group',      '+998 98 777 88 99', 'Toshkent, Bektemir'),
  ('Nodira Xolmatova',      '+998 99 888 99 00', 'Angren sh.');

-- Har bir mahsulotga boshlang'ich kirim. Qoldiq (stock_quantity) shu kirimlardan hisoblanadi.
INSERT INTO inventory_movements (product_id, type, quantity, reason, created_by)
SELECT id, 'in', (ARRAY[200, 500, 1000, 150, 80])[1 + (id % 5)], 'Boshlang''ich kirim', 3
FROM products;

UPDATE products p
SET stock_quantity = m.qty
FROM (SELECT product_id, SUM(quantity) AS qty FROM inventory_movements GROUP BY product_id) m
WHERE m.product_id = p.id;

INSERT INTO sales (customer_id, user_id, payment_status, status) VALUES
  (1, 4, 'paid',    'completed'),
  (2, 4, 'partial', 'completed'),
  (3, 4, 'unpaid',  'new'),
  (5, 2, 'paid',    'completed'),
  (7, 4, 'partial', 'completed');

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES
  (1, 1, 20, 58000, 1160000),
  (1, 8, 100, 11000, 1100000),
  (2, 14, 3, 178000, 534000),
  (2, 16, 2, 112000, 224000),
  (3, 6, 200, 16500, 3300000),
  (4, 22, 150, 11000, 1650000),
  (4, 24, 10, 28000, 280000),
  (5, 26, 1, 1150000, 1150000),
  (5, 29, 5, 299000, 1495000);

UPDATE sales s
SET total_amount = t.total
FROM (SELECT sale_id, SUM(total_price) AS total FROM sale_items GROUP BY sale_id) t
WHERE t.sale_id = s.id;

INSERT INTO payments (sale_id, customer_id, amount, payment_method) VALUES
  (1, 1, 2260000, 'cash'),
  (2, 2,  500000, 'card'),
  (4, 5, 1930000, 'transfer'),
  (5, 7, 1500000, 'card');

INSERT INTO debts (customer_id, supplier_id, amount, status) VALUES
  (2,    NULL,  258000, 'open'),
  (3,    NULL, 3300000, 'open'),
  (7,    NULL, 1145000, 'open'),
  (NULL, 1,    5200000, 'open'),
  (NULL, 3,    2700000, 'closed');

UPDATE customers SET balance = -258000  WHERE id = 2;
UPDATE customers SET balance = -3300000 WHERE id = 3;
UPDATE customers SET balance = -1145000 WHERE id = 7;

INSERT INTO settings (key, value, description) VALUES
  ('store_name',     'Qurilishdo''koni',  'Do''kon nomi'),
  ('currency',       'UZS',               'Asosiy valyuta'),
  ('low_stock_limit','20',                'Kam qoldiq ogohlantirish chegarasi'),
  ('phone',          '+998 71 200 00 00', 'Aloqa telefoni');
