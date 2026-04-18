-- Seed data for local development/demo

BEGIN;

INSERT INTO public.clubs (name, address, phone, description, price)
VALUES
  ('Cyber Arena', 'г. Москва, ул. Пример, 1', '+7 999 111-22-33', 'Компьютерный клуб с современными ПК и периферией.', 250.00),
  ('Night Raid', 'г. Москва, ул. Пример, 2', '+7 999 444-55-66', 'Турнирная зона и VIP-комнаты.', 300.00);

INSERT INTO public.admins (email, password_hash, username, club_id)
VALUES
  ('admin1@example.com', 'demo_hash', 'admin_cyber', (SELECT id FROM public.clubs WHERE name = 'Cyber Arena' LIMIT 1)),
  ('admin2@example.com', 'demo_hash', 'admin_night', (SELECT id FROM public.clubs WHERE name = 'Night Raid' LIMIT 1));

INSERT INTO public.users (email, password_hash, username, phone)
VALUES
  ('user1@example.com', 'demo_hash', 'user1', '+7 900 000-00-01'),
  ('user2@example.com', 'demo_hash', 'user2', '+7 900 000-00-02');

-- PCs
INSERT INTO public.pcs (number, processor, gpu, ram, monitor_model, status, club_id)
SELECT n, 'Intel Core i5-13600K', 'RTX 4070', '32 GB', 'ASUS 24\" 144Hz', 'active', c.id
FROM generate_series(1, 6) AS n
CROSS JOIN (SELECT id FROM public.clubs WHERE name = 'Cyber Arena' LIMIT 1) AS c;

INSERT INTO public.pcs (number, processor, gpu, ram, monitor_model, status, club_id)
SELECT n, 'AMD Ryzen 7 7800X3D', 'RTX 4080', '32 GB', 'LG 27\" 165Hz', 'active', c.id
FROM generate_series(1, 4) AS n
CROSS JOIN (SELECT id FROM public.clubs WHERE name = 'Night Raid' LIMIT 1) AS c;

-- Peripherals
INSERT INTO public.peripherals (type, model, brand, description)
VALUES
  ('mouse', 'G Pro X Superlight', 'Logitech', 'Легкая игровая мышь'),
  ('keyboard', 'Huntsman V2', 'Razer', 'Механическая клавиатура'),
  ('headset', 'Cloud II', 'HyperX', 'Игровая гарнитура'),
  ('mousepad', 'QCK+', 'SteelSeries', 'Коврик среднего размера');

-- Attach peripherals to first PC of first club
WITH pc AS (
  SELECT p.id
  FROM public.pcs p
  JOIN public.clubs c ON c.id = p.club_id
  WHERE c.name = 'Cyber Arena' AND p.number = 1
  LIMIT 1
)
INSERT INTO public.pc_peripherals (quantity, pc_id, peripheral_id)
SELECT 1, pc.id, per.id
FROM pc
JOIN public.peripherals per ON per.type IN ('mouse','keyboard','headset','mousepad');

-- Tariffs example (per-hour)
INSERT INTO public.tariffs (club_id, day_of_week, time_from, time_to, price_per_hour)
VALUES
  ((SELECT id FROM public.clubs WHERE name='Cyber Arena' LIMIT 1), NULL, NULL, NULL, 250.00),
  ((SELECT id FROM public.clubs WHERE name='Night Raid' LIMIT 1), NULL, NULL, NULL, 300.00);

COMMIT;

