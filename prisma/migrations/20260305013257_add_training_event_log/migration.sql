-- CreateTable
CREATE TABLE "TrainingEvent" (
    "id" SERIAL NOT NULL,
    "telegramId" TEXT NOT NULL,
    "verseId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "lastTrainingModeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingEvent_telegramId_reviewedAt_idx" ON "TrainingEvent"("telegramId", "reviewedAt");

-- CreateIndex
CREATE INDEX "TrainingEvent_reviewedAt_idx" ON "TrainingEvent"("reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEvent_telegramId_verseId_reviewedAt_key" ON "TrainingEvent"("telegramId", "verseId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "TrainingEvent" ADD CONSTRAINT "TrainingEvent_telegramId_fkey" FOREIGN KEY ("telegramId") REFERENCES "User"("telegramId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvent" ADD CONSTRAINT "TrainingEvent_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

