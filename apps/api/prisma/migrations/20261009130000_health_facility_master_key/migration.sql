-- AlterTable
ALTER TABLE "HealthFacility" ADD COLUMN "masterKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HealthFacility_masterKey_key" ON "HealthFacility"("masterKey");
