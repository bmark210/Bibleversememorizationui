ALTER TABLE "UserVerse"
ADD COLUMN IF NOT EXISTS "reviewLapseStreak" INTEGER;

UPDATE "UserVerse"
SET "reviewLapseStreak" = 0
WHERE "reviewLapseStreak" IS NULL;

ALTER TABLE "UserVerse"
ALTER COLUMN "reviewLapseStreak" SET DEFAULT 0;

ALTER TABLE "UserVerse"
ALTER COLUMN "reviewLapseStreak" SET NOT NULL;
