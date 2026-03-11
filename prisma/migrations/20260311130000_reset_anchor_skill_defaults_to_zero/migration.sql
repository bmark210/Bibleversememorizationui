UPDATE "UserVerse"
SET
  "referenceScore" = 0,
  "incipitScore" = 0,
  "contextScore" = 0;

ALTER TABLE "UserVerse"
  ALTER COLUMN "referenceScore" SET DEFAULT 0,
  ALTER COLUMN "incipitScore" SET DEFAULT 0,
  ALTER COLUMN "contextScore" SET DEFAULT 0;
