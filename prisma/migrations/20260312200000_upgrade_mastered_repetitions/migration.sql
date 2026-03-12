-- UpgradeMasteredRepetitions
-- REVIEW_REPETITIONS_MAX changes from 3 to 7.
-- All verses that were previously MASTERED (repetitions >= 3 AND masteryLevel >= 7)
-- must be updated to the new threshold (repetitions = 7) to preserve their MASTERED status.
-- Also set nextReviewAt to 180 days from now for maintenance review.

UPDATE "UserVerse"
SET "repetitions" = 7,
    "nextReviewAt" = NOW() + INTERVAL '180 days'
WHERE "repetitions" >= 3
  AND "masteryLevel" >= 7;
