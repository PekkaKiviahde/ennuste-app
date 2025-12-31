-- 0017_add_user_pin_hash.sql
-- Lisää pin_hash users-tauluun (dev-auth)
-- Päivitetty: 2025-12-31

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_hash text;
