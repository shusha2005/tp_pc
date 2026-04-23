-- Schema for "PC Club Booking" (PostgreSQL)
-- Applies core entities from ER + constraints to prevent double booking.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  phone         TEXT
);

-- CLUBS
CREATE TABLE IF NOT EXISTS public.clubs (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  phone       TEXT,
  description TEXT,
  photo_url   TEXT,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0)
);

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS public.club_photos (
  id      BIGSERIAL PRIMARY KEY,
  club_id BIGINT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  url     TEXT NOT NULL
);

-- ADMINS (separate entity as in ER-diagram)
CREATE TABLE IF NOT EXISTS public.admins (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  club_id       BIGINT REFERENCES public.clubs(id) ON DELETE SET NULL
);

-- PCs
CREATE TABLE IF NOT EXISTS public.pcs (
  id            BIGSERIAL PRIMARY KEY,
  number        INT NOT NULL,
  processor     TEXT,
  gpu           TEXT,
  ram           TEXT,
  storage_type  TEXT CHECK (storage_type IN ('SSD','HDD','SSD+HDD','NVMe')),
  monitor_model TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  club_id       BIGINT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  UNIQUE (club_id, number)
);

ALTER TABLE public.pcs
  ADD COLUMN IF NOT EXISTS storage_type TEXT;

-- PERIPHERALS
CREATE TABLE IF NOT EXISTS public.peripherals (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  model       TEXT,
  brand       TEXT,
  description TEXT
);

-- PC_PERIPHERALS (many-to-many + quantity)
CREATE TABLE IF NOT EXISTS public.pc_peripherals (
  id            BIGSERIAL PRIMARY KEY,
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  pc_id         BIGINT NOT NULL REFERENCES public.pcs(id) ON DELETE CASCADE,
  peripheral_id BIGINT NOT NULL REFERENCES public.peripherals(id) ON DELETE CASCADE,
  UNIQUE (pc_id, peripheral_id)
);

-- TARIFFS (pricing rules per club)
CREATE TABLE IF NOT EXISTS public.tariffs (
  id             BIGSERIAL PRIMARY KEY,
  club_id        BIGINT NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  day_of_week    SMALLINT, -- 0..6 (Mon..Sun), NULL = any day
  time_from      TIME,
  time_to        TIME,
  price_per_hour NUMERIC(12,2) NOT NULL CHECK (price_per_hour >= 0),
  CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  CHECK ((time_from IS NULL AND time_to IS NULL) OR (time_from IS NOT NULL AND time_to IS NOT NULL)),
  CHECK (time_from IS NULL OR time_to > time_from)
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id          BIGSERIAL PRIMARY KEY,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  status      TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','confirmed','cancelled','completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pc_id       BIGINT NOT NULL REFERENCES public.pcs(id) ON DELETE CASCADE,
  CHECK (end_time > start_time)
);

-- Prevent overlapping bookings per PC (no double booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap_per_pc'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_no_overlap_per_pc
      EXCLUDE USING gist (
        pc_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (status IN ('created','confirmed'));
  END IF;
END$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_pc_id_idx   ON public.bookings(pc_id);
CREATE INDEX IF NOT EXISTS pcs_club_id_idx      ON public.pcs(club_id);
CREATE INDEX IF NOT EXISTS pc_peripherals_pc_id_idx ON public.pc_peripherals(pc_id);
CREATE INDEX IF NOT EXISTS pc_peripherals_peripheral_id_idx ON public.pc_peripherals(peripheral_id);
CREATE INDEX IF NOT EXISTS tariffs_club_id_idx ON public.tariffs(club_id);
CREATE INDEX IF NOT EXISTS club_photos_club_id_idx ON public.club_photos(club_id);

COMMIT;

