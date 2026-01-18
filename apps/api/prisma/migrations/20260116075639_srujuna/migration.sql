-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "HealthPreference" AS ENUM ('NORMAL', 'DIABETES_T1', 'DIABETES_T2', 'HIGH_BP', 'FAT_RELATED_OBESITY', 'DIABETES_OBESITY');

-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('CAMERA', 'UPLOAD');

-- CreateEnum
CREATE TYPE "FoodKind" AS ENUM ('BEVERAGE', 'SOLID', 'FRUIT_VEG', 'NOT_FOOD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PointsEventType" AS ENUM ('SCAN_FOOD', 'BALANCED_DAY', 'AVOID_RISKY_FOOD', 'CHOOSE_HEALTHIER_OPTION', 'REPEATED_EXCESS_SUGAR', 'REPEATED_RED_FAT_SALT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthPreferenceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preference" "HealthPreference" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthPreferenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLimits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sugarLimit" DOUBLE PRECISION NOT NULL,
    "fatLimit" DOUBLE PRECISION NOT NULL,
    "satFatLimit" DOUBLE PRECISION NOT NULL,
    "saltLimit" DOUBLE PRECISION NOT NULL,
    "prefAtTime" "HealthPreference" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLimits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyIntake" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "freeSugarG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "naturalSugarG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satFatG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saltG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "redFatItems" INTEGER NOT NULL DEFAULT 0,
    "redSaltItems" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedFlags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "earned" BOOLEAN NOT NULL DEFAULT false,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "endedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PointsEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "PointsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ScanSource" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "barcode" TEXT,
    "kind" "FoodKind" NOT NULL,
    "title" TEXT,
    "raw" JSONB NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "ScanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguagePreference" (
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguagePreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "HealthPreferenceHistory_userId_effectiveFrom_idx" ON "HealthPreferenceHistory"("userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "DailyLimits_date_idx" ON "DailyLimits"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLimits_userId_date_key" ON "DailyLimits"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyIntake_userId_date_key" ON "DailyIntake"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RedFlags_userId_date_key" ON "RedFlags"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StreakHistory_userId_date_key" ON "StreakHistory"("userId", "date");

-- CreateIndex
CREATE INDEX "PointsHistory_userId_createdAt_idx" ON "PointsHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Leaderboard_points_reachedAt_idx" ON "Leaderboard"("points", "reachedAt");

-- CreateIndex
CREATE INDEX "ScanHistory_userId_createdAt_idx" ON "ScanHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthPreferenceHistory" ADD CONSTRAINT "HealthPreferenceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLimits" ADD CONSTRAINT "DailyLimits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyIntake" ADD CONSTRAINT "DailyIntake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlags" ADD CONSTRAINT "RedFlags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakHistory" ADD CONSTRAINT "StreakHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsHistory" ADD CONSTRAINT "PointsHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanHistory" ADD CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguagePreference" ADD CONSTRAINT "LanguagePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
