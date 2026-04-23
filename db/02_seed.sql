-- Seed data for local development/demo
-- Re-runnable: fully resets business tables and repopulates consistent demo data.

BEGIN;

-- Bring legacy schemas to current shape before seeding.
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.pcs ADD COLUMN IF NOT EXISTS storage_type TEXT;

TRUNCATE TABLE
  public.bookings,
  public.tariffs,
  public.club_photos,
  public.pc_peripherals,
  public.peripherals,
  public.pcs,
  public.admins,
  public.users,
  public.clubs
RESTART IDENTITY CASCADE;

-- Clubs (3+ with different pricing and photo availability)
INSERT INTO public.clubs (name, address, phone, description, photo_url, price)
VALUES
  ('CyberZone', 'г. Воронеж, ул. Ленина, 10', '+7 900 100-10-10', 'Современный киберклуб с турнирной зоной.', 'https://images.unsplash.com/photo-1542751371-adc38448a05e', 150.00),
  ('eSport Arena', 'г. Воронеж, пр. Мира, 5', '+7 900 200-20-20', 'Премиальные ПК и профессиональная периферия.', 'https://images.unsplash.com/photo-1511512578047-dfb367046420', 250.00),
  ('Old School Club', 'г. Воронеж, ул. Садовая, 2', '+7 900 300-30-30', 'Доступный формат для ежедневных игр.', NULL, 70.00),
  ('Night Owls', 'г. Воронеж, ул. Плехановская, 18', '+7 900 400-40-40', 'Ночные тарифы и комфортные посадочные места.', 'https://images.unsplash.com/photo-1593305841991-05c297ba4575', 180.00);

INSERT INTO public.club_photos (club_id, url)
SELECT id, photo_url
FROM public.clubs
WHERE photo_url IS NOT NULL
UNION ALL
SELECT c.id, v.url
FROM public.clubs c
JOIN (
  VALUES
    ('CyberZone', 'https://images.unsplash.com/photo-1560253023-3ec5d502959f'),
    ('eSport Arena', 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c'),
    ('Old School Club', 'https://images.unsplash.com/photo-1511882150382-421056c89033'),
    ('Night Owls', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f')
) AS v(name, url) ON v.name = c.name;

-- Admins / Users
-- admin@example.com / admin123
-- users: user12345
INSERT INTO public.admins (email, password_hash, username, club_id)
VALUES
  (
    'admin@example.com',
    'pbkdf2_sha256$1000000$tyuUUldL2LOohVM5yNJhNl$XD//8FlxOyBw+zNuXU6mkERh0F6b4NdHvW+sHgE6WOs=',
    'admin_main',
    (SELECT id FROM public.clubs WHERE name = 'CyberZone' LIMIT 1)
  ),
  (
    'arena.admin@example.com',
    'pbkdf2_sha256$1000000$tyuUUldL2LOohVM5yNJhNl$XD//8FlxOyBw+zNuXU6mkERh0F6b4NdHvW+sHgE6WOs=',
    'arena_admin',
    (SELECT id FROM public.clubs WHERE name = 'eSport Arena' LIMIT 1)
  );

INSERT INTO public.users (email, password_hash, username, phone)
VALUES
  ('ivanov@example.com', 'pbkdf2_sha256$1000000$3zbV7OHOx0vJCY3jIboftt$WzjpC4wD0MTTNjTQ2ZVc+p1nlVCzokRQKDryvIe1ZnY=', 'ivanov', '+7 900 555-11-11'),
  ('petrova@example.com', 'pbkdf2_sha256$1000000$3zbV7OHOx0vJCY3jIboftt$WzjpC4wD0MTTNjTQ2ZVc+p1nlVCzokRQKDryvIe1ZnY=', 'petrova', '+7 900 555-22-22'),
  ('sidorov@example.com', 'pbkdf2_sha256$1000000$3zbV7OHOx0vJCY3jIboftt$WzjpC4wD0MTTNjTQ2ZVc+p1nlVCzokRQKDryvIe1ZnY=', 'sidorov', '+7 900 555-33-33');

-- PCs: 6 per club (24 total), enough for list/filter demos
WITH pc_rows(club_name, number, processor, gpu, ram, storage_type, monitor_model, status) AS (
  VALUES
    -- CyberZone
    ('CyberZone', 1, 'Intel Core i5-12400F', 'RTX 3060', '16GB', 'SSD', 'AOC 24G2', 'active'),
    ('CyberZone', 2, 'AMD Ryzen 5 5600X', 'RTX 4070', '32GB', 'NVMe', 'LG 27GN800', 'active'),
    ('CyberZone', 3, 'Intel Core i7-12700K', 'RX 6600', '16GB', 'SSD', 'ASUS VG249Q', 'maintenance'),
    ('CyberZone', 4, 'AMD Ryzen 7 5700X', 'GTX 1660 Super', '8GB', 'HDD', 'Samsung Odyssey G3', 'inactive'),
    ('CyberZone', 5, 'Intel Core i5-12400F', 'RTX 3060', '16GB', 'NVMe', 'Acer Nitro VG240Y', 'active'),
    ('CyberZone', 6, 'AMD Ryzen 5 5600X', 'RTX 4070', '32GB', 'SSD', 'LG 24GN650', 'active'),
    -- eSport Arena
    ('eSport Arena', 1, 'Intel Core i7-12700K', 'RTX 4070', '32GB', 'NVMe', 'BenQ Zowie XL2546', 'active'),
    ('eSport Arena', 2, 'AMD Ryzen 7 5800X', 'RTX 3060', '16GB', 'SSD', 'AOC 24G2', 'active'),
    ('eSport Arena', 3, 'Intel Core i5-12400F', 'RX 6600', '16GB', 'SSD', 'LG 24GN600', 'active'),
    ('eSport Arena', 4, 'AMD Ryzen 5 5600X', 'GTX 1660 Super', '8GB', 'HDD', 'ASUS VP249Q', 'maintenance'),
    ('eSport Arena', 5, 'Intel Core i7-12700K', 'RTX 4070', '32GB', 'NVMe', 'Samsung Odyssey G5', 'active'),
    ('eSport Arena', 6, 'AMD Ryzen 7 5700X', 'RTX 3060', '16GB', 'SSD', 'Acer KG241', 'inactive'),
    -- Old School Club
    ('Old School Club', 1, 'Intel Core i5-10400F', 'GTX 1660 Super', '8GB', 'HDD', 'Philips 241V8', 'active'),
    ('Old School Club', 2, 'AMD Ryzen 5 3600', 'RX 6600', '16GB', 'SSD', 'AOC 22B2H', 'active'),
    ('Old School Club', 3, 'Intel Core i5-12400F', 'RTX 3060', '16GB', 'SSD', 'LG 24MK430H', 'maintenance'),
    ('Old School Club', 4, 'AMD Ryzen 5 5600X', 'GTX 1660 Super', '8GB', 'HDD', 'Samsung F24T35', 'active'),
    ('Old School Club', 5, 'Intel Core i3-12100F', 'RX 6600', '16GB', 'SSD', 'Acer SA240Y', 'inactive'),
    ('Old School Club', 6, 'Intel Core i5-10400F', 'GTX 1660 Super', '8GB', 'HDD', 'Philips 241V8', 'active'),
    -- Night Owls
    ('Night Owls', 1, 'Intel Core i5-12400F', 'RTX 3060', '16GB', 'SSD', 'LG 24GN650', 'active'),
    ('Night Owls', 2, 'AMD Ryzen 5 5600X', 'RTX 4070', '32GB', 'NVMe', 'AOC CQ27G2', 'active'),
    ('Night Owls', 3, 'Intel Core i7-12700K', 'RTX 4070', '32GB', 'NVMe', 'BenQ Zowie XL2546', 'maintenance'),
    ('Night Owls', 4, 'AMD Ryzen 7 5700X', 'RX 6600', '16GB', 'SSD', 'ASUS TUF VG27AQ', 'active'),
    ('Night Owls', 5, 'Intel Core i5-12400F', 'GTX 1660 Super', '8GB', 'HDD', 'Acer Nitro VG240Y', 'inactive'),
    ('Night Owls', 6, 'AMD Ryzen 5 5600X', 'RTX 3060', '16GB', 'SSD', 'LG 24GN600', 'active')
)
INSERT INTO public.pcs (number, processor, gpu, ram, storage_type, monitor_model, status, club_id)
SELECT
  pr.number, pr.processor, pr.gpu, pr.ram, pr.storage_type, pr.monitor_model, pr.status, c.id
FROM pc_rows pr
JOIN public.clubs c ON c.name = pr.club_name;

-- Peripherals catalog
INSERT INTO public.peripherals (type, model, brand, description)
VALUES
  ('mouse', 'G502 Hero', 'Logitech', 'Игровая мышь'),
  ('mouse', 'Viper Mini', 'Razer', 'Компактная игровая мышь'),
  ('mouse', 'Bloody V8', 'A4Tech', 'Оптическая мышь'),
  ('keyboard', 'BlackWidow V3', 'Razer', 'Механическая клавиатура'),
  ('keyboard', 'K120', 'Logitech', 'Мембранная клавиатура'),
  ('keyboard', 'Alloy Origins', 'HyperX', 'Механическая клавиатура'),
  ('headset', 'Cloud II', 'HyperX', 'Игровая гарнитура'),
  ('headset', 'G Pro X', 'Logitech', 'Гарнитура с USB-картой'),
  ('headset', 'Kraken X', 'Razer', 'Легкая гарнитура'),
  ('monitor', '24G2', 'AOC', 'Монитор 24 дюйма 144Гц'),
  ('monitor', '27GN800', 'LG', 'Монитор 27 дюймов 144Гц'),
  ('mousepad', 'QCK+', 'SteelSeries', 'Игровой коврик');

-- Assign 3-4 peripherals to each PC
WITH links(club_name, pc_number, per_model, qty) AS (
  VALUES
    ('CyberZone', 1, 'G502 Hero', 1), ('CyberZone', 1, 'BlackWidow V3', 1), ('CyberZone', 1, 'Cloud II', 1), ('CyberZone', 1, '24G2', 1),
    ('CyberZone', 2, 'Viper Mini', 1), ('CyberZone', 2, 'Alloy Origins', 1), ('CyberZone', 2, 'G Pro X', 1),
    ('CyberZone', 3, 'G502 Hero', 1), ('CyberZone', 3, 'K120', 1), ('CyberZone', 3, 'Kraken X', 1),
    ('CyberZone', 4, 'Bloody V8', 1), ('CyberZone', 4, 'K120', 1), ('CyberZone', 4, 'Cloud II', 1),
    ('CyberZone', 5, 'Viper Mini', 1), ('CyberZone', 5, 'BlackWidow V3', 1), ('CyberZone', 5, 'G Pro X', 1),
    ('CyberZone', 6, 'G502 Hero', 1), ('CyberZone', 6, 'Alloy Origins', 1), ('CyberZone', 6, 'Kraken X', 1),
    ('eSport Arena', 1, 'Viper Mini', 1), ('eSport Arena', 1, 'BlackWidow V3', 1), ('eSport Arena', 1, 'G Pro X', 1), ('eSport Arena', 1, '27GN800', 1),
    ('eSport Arena', 2, 'G502 Hero', 1), ('eSport Arena', 2, 'Alloy Origins', 1), ('eSport Arena', 2, 'Cloud II', 1),
    ('eSport Arena', 3, 'Bloody V8', 1), ('eSport Arena', 3, 'K120', 1), ('eSport Arena', 3, 'Kraken X', 1),
    ('eSport Arena', 4, 'G502 Hero', 1), ('eSport Arena', 4, 'K120', 1), ('eSport Arena', 4, 'Cloud II', 1),
    ('eSport Arena', 5, 'Viper Mini', 1), ('eSport Arena', 5, 'BlackWidow V3', 1), ('eSport Arena', 5, 'G Pro X', 1),
    ('eSport Arena', 6, 'Bloody V8', 1), ('eSport Arena', 6, 'Alloy Origins', 1), ('eSport Arena', 6, 'Kraken X', 1),
    ('Old School Club', 1, 'Bloody V8', 1), ('Old School Club', 1, 'K120', 1), ('Old School Club', 1, 'Kraken X', 1),
    ('Old School Club', 2, 'G502 Hero', 1), ('Old School Club', 2, 'K120', 1), ('Old School Club', 2, 'Cloud II', 1),
    ('Old School Club', 3, 'Viper Mini', 1), ('Old School Club', 3, 'Alloy Origins', 1), ('Old School Club', 3, 'G Pro X', 1),
    ('Old School Club', 4, 'Bloody V8', 1), ('Old School Club', 4, 'K120', 1), ('Old School Club', 4, 'Cloud II', 1),
    ('Old School Club', 5, 'G502 Hero', 1), ('Old School Club', 5, 'Alloy Origins', 1), ('Old School Club', 5, 'Kraken X', 1),
    ('Old School Club', 6, 'Bloody V8', 1), ('Old School Club', 6, 'K120', 1), ('Old School Club', 6, 'QCK+', 1),
    ('Night Owls', 1, 'G502 Hero', 1), ('Night Owls', 1, 'BlackWidow V3', 1), ('Night Owls', 1, 'Cloud II', 1),
    ('Night Owls', 2, 'Viper Mini', 1), ('Night Owls', 2, 'Alloy Origins', 1), ('Night Owls', 2, 'G Pro X', 1),
    ('Night Owls', 3, 'Viper Mini', 1), ('Night Owls', 3, 'BlackWidow V3', 1), ('Night Owls', 3, 'G Pro X', 1), ('Night Owls', 3, '27GN800', 1),
    ('Night Owls', 4, 'G502 Hero', 1), ('Night Owls', 4, 'Alloy Origins', 1), ('Night Owls', 4, 'Kraken X', 1),
    ('Night Owls', 5, 'Bloody V8', 1), ('Night Owls', 5, 'K120', 1), ('Night Owls', 5, 'Cloud II', 1),
    ('Night Owls', 6, 'G502 Hero', 1), ('Night Owls', 6, 'Alloy Origins', 1), ('Night Owls', 6, 'G Pro X', 1)
)
INSERT INTO public.pc_peripherals (quantity, pc_id, peripheral_id)
SELECT
  l.qty,
  p.id,
  per.id
FROM links l
JOIN public.clubs c ON c.name = l.club_name
JOIN public.pcs p ON p.club_id = c.id AND p.number = l.pc_number
JOIN public.peripherals per ON per.model = l.per_model;

-- Tariffs
INSERT INTO public.tariffs (club_id, day_of_week, time_from, time_to, price_per_hour)
VALUES
  ((SELECT id FROM public.clubs WHERE name = 'CyberZone' LIMIT 1), NULL, NULL, NULL, 150.00),
  ((SELECT id FROM public.clubs WHERE name = 'eSport Arena' LIMIT 1), NULL, NULL, NULL, 250.00),
  ((SELECT id FROM public.clubs WHERE name = 'Old School Club' LIMIT 1), NULL, NULL, NULL, 70.00),
  ((SELECT id FROM public.clubs WHERE name = 'Night Owls' LIMIT 1), NULL, NULL, NULL, 180.00);

COMMIT;

