BEGIN;

ALTER TABLE "UserVerse"
  ADD COLUMN IF NOT EXISTS "referenceScore" INTEGER;

ALTER TABLE "UserVerse"
  ADD COLUMN IF NOT EXISTS "incipitScore" INTEGER;

UPDATE "UserVerse"
SET "referenceScore" = 50
WHERE "referenceScore" IS NULL;

UPDATE "UserVerse"
SET "incipitScore" = 50
WHERE "incipitScore" IS NULL;

ALTER TABLE "UserVerse"
  ALTER COLUMN "referenceScore" SET DEFAULT 50,
  ALTER COLUMN "referenceScore" SET NOT NULL,
  ALTER COLUMN "incipitScore" SET DEFAULT 50,
  ALTER COLUMN "incipitScore" SET NOT NULL;

COMMIT;
