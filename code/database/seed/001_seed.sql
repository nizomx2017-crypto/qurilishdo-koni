-- =============================================================
-- Qurilishdo'koni — namunaviy ma'lumotlar
--   Admin: admin@qurilish.uz / admin123
--   User:  user@qurilish.uz  / user123
-- =============================================================

INSERT INTO roles (id, name, description) VALUES
  (1, 'admin', 'Kategoriya, mahsulot va barcha buyurtmalarni boshqaradi'),
  (2, 'user',  'Katalogni ko''radi, savatchani boshqaradi va buyurtma beradi');

INSERT INTO users (id, full_name, email, phone, password_hash, role_id) VALUES
  (1, 'Aziz Karimov', 'admin@qurilish.uz', '+998901234567',
   '176f1d1479d59edff3b839f019be0541:99657eb8eb978e50604765887ba4c897d575d124ff27b8f11c8ce421d9aa26f8d005e66d7d9ca4b01b549c5122bf39670c1383d6fe2a874e590f4d758c654978', 1),
  (2, 'Dilnoza Rahimova', 'user@qurilish.uz', '+998939876543',
   '410a82cff126663e70f7013ba7be3bee:51da4fd955934e8d5ceefcb71c9eac545276bf84bf2f5dfcf06486589a32a730f52cee1612324d87ae758e53bb27ef9bb312afad57c7376606662c4bf206fa65', 2);

INSERT INTO categories (id, name, description) VALUES
  (1, 'Sement va qorishmalar', 'Sement, gips, shtukaturka va plitka yelimlari'),
  (2, 'G''isht va bloklar',    'G''isht, gazoblok va penobloklar'),
  (3, 'Metall buyumlar',       'Armatura, profil truba va sim'),
  (4, 'Bo''yoqlar',            'Ichki va tashqi bo''yoqlar, gruntovka'),
  (5, 'Santexnika',            'Quvurlar, kranlar va fitinglar'),
  (6, 'Elektr mollari',        'Kabel, rozetka, avtomat va chiroqlar'),
  (7, 'Asboblar',              'Qo''l va elektr asboblari'),
  (8, 'Yog''och va fanera',    'Taxta, fanera va OSB plitalar');

INSERT INTO products (id, name, category_id, sku, description, unit, price, stock_quantity) VALUES
  ( 1, 'Sement M400 (50 kg)',            1, 'SEM-400',  'Umumiy qurilish ishlari uchun portlandsement', 'qop',     58000, 320),
  ( 2, 'Sement M500 (50 kg)',            1, 'SEM-500',  'Yuqori mustahkamlikdagi sement, poydevor uchun', 'qop',  67000, 180),
  ( 3, 'Shtukaturka gips (30 kg)',       1, 'GIP-30',   'Ichki devorlarni tekislash uchun gipsli aralashma', 'qop', 52000, 95),
  ( 4, 'Plitka yelimi (25 kg)',          1, 'YEL-25',   'Kafel va keramogranit uchun yelim', 'qop',               44000, 140),
  ( 5, 'Qizil g''isht',                  2, 'GSH-QZL',  'An''anaviy pishiq g''isht, 250x120x65 mm', 'dona',          1100, 15000),
  ( 6, 'Gazoblok 600x300x200',           2, 'GZB-200',  'Yengil va issiqlikni saqlaydigan blok', 'dona',          16500, 1200),
  ( 7, 'Penoblok 600x300x100',           2, 'PNB-100',  'Ichki to''siqlar uchun', 'dona',                           9500, 800),
  ( 8, 'Armatura 12 mm (11.7 m)',        3, 'ARM-12',   'A500C sinfidagi armatura', 'dona',                        98000, 400),
  ( 9, 'Armatura 10 mm (11.7 m)',        3, 'ARM-10',   'A500C sinfidagi armatura', 'dona',                        69000, 450),
  (10, 'Profil truba 40x20 (6 m)',       3, 'PRF-4020', 'Karkas va darvozalar uchun', 'dona',                     115000, 120),
  (11, 'Bog''lovchi sim (1 kg)',         3, 'SIM-1',    'Armaturani bog''lash uchun yumshoq sim', 'kg',            22000, 300),
  (12, 'Emulsiya bo''yoq oq (20 kg)',    4, 'BOY-EM20', 'Ichki devor va shiftlar uchun', 'chelak',            285000, 60),
  (13, 'Fasad bo''yog''i (15 kg)',       4, 'BOY-FS15', 'Namlikka chidamli tashqi bo''yoq', 'chelak',          340000, 35),
  (14, 'Gruntovka (10 l)',               4, 'GRN-10',   'Chuqur singuvchi gruntovka', 'kanistr',                  98000, 80),
  (15, 'PPR quvur 20 mm (4 m)',          5, 'PPR-20',   'Issiq va sovuq suv uchun', 'dona',                        24000, 500),
  (16, 'PPR quvur 25 mm (4 m)',          5, 'PPR-25',   'Issiq va sovuq suv uchun', 'dona',                        33000, 350),
  (17, 'Sharli kran 1/2"',               5, 'KRN-12',   'Latun sharli kran', 'dona',                               45000, 150),
  (18, 'Oshxona smesitel',               5, 'SMS-OSH',  'Bir dastali, aylanadigan jo''mrak', 'dona',              260000, 25),
  (19, 'Kabel VVG 3x2.5 (1 m)',          6, 'KBL-325',  'Mis kabel, rozetka liniyalari uchun', 'metr',            14500, 2000),
  (20, 'Rozetka ikkilik (yerga ulangan)', 6, 'RZT-2',   'Ichki o''rnatish uchun', 'dona',                           38000, 200),
  (21, 'Avtomat 16A',                    6, 'AVT-16',   'Bir qutbli avtomatik o''chirgich', 'dona',                42000, 180),
  (22, 'LED chiroq 12W',                 6, 'LED-12',   'E27 patron, issiq yorug''lik', 'dona',                    18000, 400),
  (23, 'Perforator 800W',                7, 'PRF-800',  'SDS-plus, 3 rejimli', 'dona',                          890000, 12),
  (24, 'Shurupovert 18V',                7, 'SHR-18',   'Ikki akkumulyatorli', 'dona',                           650000, 15),
  (25, 'Ruletka 5 m',                    7, 'RUL-5',    'Magnitli uchli', 'dona',                                   35000, 90),
  (26, 'Bolg''a 500 g',                  7, 'BLG-500',  'Fiberglass dastali', 'dona',                               55000, 60),
  (27, 'Fanera 18 mm (1525x1525)',       8, 'FNR-18',   'Qayin fanera, 4/4 nav', 'list',                          310000, 40),
  (28, 'OSB plita 9 mm (2500x1250)',     8, 'OSB-9',    'Tom va pol uchun', 'list',                               175000, 70),
  (29, 'Taxta 50x150 (6 m)',             8, 'TXT-50',   'Quritilgan qarag''ay taxta', 'dona',                     145000, 0);

-- Userning bitta namunaviy buyurtmasi (qoldiq yuqorida shu buyurtma hisobga olingan holda berilgan)
INSERT INTO orders (id, user_id, total_amount, status, phone, address, note, created_at, updated_at) VALUES
  (1, 2, 432000, 'confirmed', '+998939876543', 'Toshkent sh., Chilonzor tumani, 9-mavze, 12-uy', 'Ertalab olib keling',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

INSERT INTO order_items (order_id, product_id, product_name, unit, unit_price, quantity, total_price) VALUES
  (1, 1,  'Sement M400 (50 kg)',  'qop', 58000, 5, 290000),
  (1, 11, 'Bog''lovchi sim (1 kg)', 'kg', 22000, 2, 44000),
  (1, 14, 'Gruntovka (10 l)',      'kanistr', 98000, 1, 98000);

-- Userning savatchasida 2 ta mahsulot
INSERT INTO cart_items (user_id, product_id, quantity) VALUES
  (2, 6, 20),
  (2, 4, 3);

-- Aniq id bilan kiritilgani uchun ketma-ketliklarni (SERIAL) to'g'rilaymiz
SELECT setval(pg_get_serial_sequence('roles', 'id'),       (SELECT MAX(id) FROM roles));
SELECT setval(pg_get_serial_sequence('users', 'id'),       (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('categories', 'id'),  (SELECT MAX(id) FROM categories));
SELECT setval(pg_get_serial_sequence('products', 'id'),    (SELECT MAX(id) FROM products));
SELECT setval(pg_get_serial_sequence('orders', 'id'),      (SELECT MAX(id) FROM orders));
