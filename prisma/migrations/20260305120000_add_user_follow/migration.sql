CREATE TABLE "UserFollow" (
  "id" TEXT NOT NULL,
  "followerTelegramId" TEXT NOT NULL,
  "followingTelegramId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserFollow_followerTelegramId_followingTelegramId_key"
  ON "UserFollow"("followerTelegramId", "followingTelegramId");

CREATE INDEX "UserFollow_followerTelegramId_createdAt_idx"
  ON "UserFollow"("followerTelegramId", "createdAt");

CREATE INDEX "UserFollow_followingTelegramId_idx"
  ON "UserFollow"("followingTelegramId");

ALTER TABLE "UserFollow"
  ADD CONSTRAINT "UserFollow_followerTelegramId_fkey"
  FOREIGN KEY ("followerTelegramId")
  REFERENCES "User"("telegramId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "UserFollow"
  ADD CONSTRAINT "UserFollow_followingTelegramId_fkey"
  FOREIGN KEY ("followingTelegramId")
  REFERENCES "User"("telegramId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
