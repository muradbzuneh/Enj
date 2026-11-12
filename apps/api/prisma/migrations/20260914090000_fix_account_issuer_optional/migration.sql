-- AlterTable
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "account_issuer_accountId_uidx";

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_uidx" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "account_issuer_idx" ON "account"("issuer");
