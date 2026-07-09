-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'FIRM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "PlanFollowed" AS ENUM ('YES', 'NO', 'NA');

-- CreateEnum
CREATE TYPE "KeepDrop" AS ENUM ('KEEP', 'DROP', 'UNDECIDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "razorpaySubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "profitTargetPercent" DOUBLE PRECISION,
    "maxDrawdownPercent" DOUBLE PRECISION,
    "minTradingDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChallengeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "challengeAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayNumberInChallenge" INTEGER,
    "accountBalance" DOUBLE PRECISION NOT NULL,
    "newsEvents" TEXT,
    "preSessionBiasHtf" TEXT,
    "keyVpLevels" TEXT,
    "dailyLossLimitHit" BOOLEAN NOT NULL DEFAULT false,
    "stayedWithinMaxTrades" BOOLEAN NOT NULL DEFAULT true,
    "whatWorkedToday" TEXT,
    "whatToFixTomorrow" TEXT,
    "chartSnapshotNotes" TEXT,
    "chartSnapshotUrl" TEXT,
    "oneLineLesson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "tradeNumber" INTEGER NOT NULL,
    "time" TEXT,
    "direction" "Direction" NOT NULL,
    "entry" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "riskReward" TEXT,
    "method" TEXT,
    "cotSignal" TEXT,
    "resultR" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION,
    "setupDescription" TEXT,
    "domConfirmation" TEXT,
    "followedPlan" "PlanFollowed" NOT NULL DEFAULT 'NA',

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionLog" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "sleepQuality" INTEGER,
    "mentalClarity" INTEGER,
    "confidenceInPlan" INTEGER,
    "morningRoutineDone" BOOLEAN NOT NULL DEFAULT false,
    "externalStress" TEXT,
    "physicalState" TEXT,
    "overallEmotionalState" INTEGER,
    "steppedAwayAfterClose" BOOLEAN,
    "windDownUsed" BOOLEAN,
    "carryoverThoughts" TEXT,
    "reflectionNotes" TEXT,
    "disciplineChecklist" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeEmotion" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "emotionBeforeEntry" TEXT,
    "emotionDuringTrade" TEXT,
    "emotionAfterClose" TEXT,
    "urgeToBreakRules" BOOLEAN NOT NULL DEFAULT false,
    "whatTriggeredIt" TEXT,

    CONSTRAINT "TradeEmotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "challengeAccountId" TEXT NOT NULL,
    "weekStarting" TIMESTAMP(3) NOT NULL,
    "weekEnding" TIMESTAMP(3) NOT NULL,
    "whatWorkedThisWeek" TEXT,
    "whatDidntWork" TEXT,
    "oneChangeForNextWeek" TEXT,
    "onTrackForTarget" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyStat" (
    "id" TEXT NOT NULL,
    "challengeAccountId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "monthlyTakeaway" TEXT,
    "onPaceToPassPhase" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setupType" TEXT NOT NULL,
    "decision" "KeepDrop" NOT NULL DEFAULT 'UNDECIDED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetupPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "Subscription"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "DailyLog_challengeAccountId_date_idx" ON "DailyLog"("challengeAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_challengeAccountId_date_key" ON "DailyLog"("challengeAccountId", "date");

-- CreateIndex
CREATE INDEX "Trade_dailyLogId_idx" ON "Trade"("dailyLogId");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionLog_dailyLogId_key" ON "EmotionLog"("dailyLogId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeEmotion_tradeId_key" ON "TradeEmotion"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_challengeAccountId_weekStarting_key" ON "WeeklyReview"("challengeAccountId", "weekStarting");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStat_challengeAccountId_month_key" ON "MonthlyStat"("challengeAccountId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SetupPreference_userId_setupType_key" ON "SetupPreference"("userId", "setupType");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAccount" ADD CONSTRAINT "ChallengeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_challengeAccountId_fkey" FOREIGN KEY ("challengeAccountId") REFERENCES "ChallengeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionLog" ADD CONSTRAINT "EmotionLog_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEmotion" ADD CONSTRAINT "TradeEmotion_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_challengeAccountId_fkey" FOREIGN KEY ("challengeAccountId") REFERENCES "ChallengeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyStat" ADD CONSTRAINT "MonthlyStat_challengeAccountId_fkey" FOREIGN KEY ("challengeAccountId") REFERENCES "ChallengeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupPreference" ADD CONSTRAINT "SetupPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
