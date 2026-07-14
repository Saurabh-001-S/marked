/*
  Warnings:

  - A unique constraint covering the columns `[dailyLogId,tradeNumber]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trade_dailyLogId_tradeNumber_key" ON "Trade"("dailyLogId", "tradeNumber");
