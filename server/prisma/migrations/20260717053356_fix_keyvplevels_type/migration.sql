/*
  Warnings:

  - The `keyVpLevels` column on the `DailyLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "DailyLog" DROP COLUMN "keyVpLevels",
ADD COLUMN     "keyVpLevels" BOOLEAN DEFAULT false;
