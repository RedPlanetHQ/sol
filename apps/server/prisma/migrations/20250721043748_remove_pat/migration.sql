/*
  Warnings:

  - You are about to drop the column `personalAccessTokenId` on the `AuthorizationCode` table. All the data in the column will be lost.
  - You are about to drop the `PersonalAccessToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PersonalAccessToken" DROP CONSTRAINT "PersonalAccessToken_userId_fkey";

-- AlterTable
ALTER TABLE "AuthorizationCode" DROP COLUMN "personalAccessTokenId",
ADD COLUMN     "apiKeyId" TEXT;

-- DropTable
DROP TABLE "PersonalAccessToken";
