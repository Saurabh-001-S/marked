/*
  Warnings:

  - You are about to drop the column `chartSnapshotUrl` on the `DailyLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyLog" DROP COLUMN "chartSnapshotUrl";

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "chartSnapshotUrl" TEXT;
