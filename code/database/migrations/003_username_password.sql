-- =============================================================
-- 003 — Xodimlar kirishi: "login + kod" -> "username + parol"
--
-- Idempotent: qayta ishga tushirilsa xato bermaydi va ma'lumotni buzmaydi.
-- Ishga tushirish:  npm run db:migrate   yoki Supabase SQL Editor'da shu fayl.
--
--  * users.login     -> users.username (kichik harf, 3–32 belgi: a-z 0-9 _ .)
--  * users.code_hash -> users.password_hash (bcrypt). Eski mijoz akkauntlarining scrypt
--    paroli (avvalgi password_hash) O'CHIRILMAYDI — legacy_password_hash ga ko'chadi.
--  * Mavjud xodimlarning vaqtinchalik paroli = eski kodi (tiresiz, katta harf: ABCD2345);
--    must_change_password = true — birinchi kirishda parolni almashtirishi shart.
--  * token_version — parol o'zgarsa/tiklansa eski access tokenlar darhol bekor bo'ladi.
-- =============================================================

BEGIN;

DO $$
BEGIN
  -- Eski (mijoz) parollari: password_hash -> legacy_password_hash, faqat code_hash hali bor bo'lsa
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'code_hash')
     AND EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'password_hash')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'legacy_password_hash')
  THEN
    ALTER TABLE users RENAME COLUMN password_hash TO legacy_password_hash;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'code_hash')
  THEN
    ALTER TABLE users RENAME COLUMN code_hash TO password_hash;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'login')
  THEN
    ALTER TABLE users RENAME COLUMN login TO username;
  END IF;
END $$;

ALTER INDEX IF EXISTS users_login_lower_uq RENAME TO users_username_lower_uq;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (LOWER(username));

-- Username: kichik harf va ruxsat etilgan belgilar. Mos kelmasa — xavfsiz ko'rinish + id (takrorlanmasin)
UPDATE users SET username = LOWER(username)
 WHERE username IS NOT NULL AND username <> LOWER(username) AND LOWER(username) ~ '^[a-z0-9_.]{3,32}$';
UPDATE users SET username = LEFT(REGEXP_REPLACE(LOWER(username), '[^a-z0-9_.]', '_', 'g'), 24) || '_' || id
 WHERE username IS NOT NULL AND username !~ '^[a-z0-9_.]{3,32}$';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_format') THEN
    ALTER TABLE users ADD CONSTRAINT users_username_format
      CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,32}$');
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version        INT NOT NULL DEFAULT 0;

COMMIT;
