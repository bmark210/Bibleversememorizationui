BEGIN;

CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");
CREATE INDEX "Feedback_telegramId_createdAt_idx" ON "Feedback"("telegramId", "createdAt");

ALTER TABLE "Feedback"
  ADD CONSTRAINT "Feedback_telegramId_fkey"
  FOREIGN KEY ("telegramId")
  REFERENCES "User"("telegramId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;
