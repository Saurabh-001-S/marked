/*
  Warnings:

  - The `newsEvents` column on the `DailyLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `preSessionBiasHtf` column on the `DailyLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Bias" AS ENUM ('BULLISH', 'BEARISH', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "TradeOutcome" AS ENUM ('SL', 'TP');

-- AlterTable
ALTER TABLE "DailyLog" DROP COLUMN "newsEvents",
ADD COLUMN     "newsEvents" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "preSessionBiasHtf",
ADD COLUMN     "preSessionBiasHtf" "Bias";

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "outcome" "TradeOutcome";
