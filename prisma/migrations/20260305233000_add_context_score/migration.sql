BEGIN;

ALTER TABLE "UserVerse"
  ADD COLUMN IF NOT EXISTS "contextScore" INTEGER;

UPDATE "UserVerse"
SET "contextScore" = 50
WHERE "contextScore" IS NULL;

ALTER TABLE "UserVerse"
  ALTER COLUMN "contextScore" SET DEFAULT 50,
  ALTER COLUMN "contextScore" SET NOT NULL;

COMMIT;
