-- CreateEnum
CREATE TYPE "MonitoringSource" AS ENUM ('SELF', 'POSYANDU', 'PUSKESMAS', 'HOSPITAL', 'CLINIC', 'MIDWIFE', 'OTHER');

-- CreateTable
CREATE TABLE "MonitoringEntry" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" "MonitoringSource" NOT NULL,
    "weightKg" DECIMAL(5,2),
    "systolicBp" INTEGER,
    "diastolicBp" INTEGER,
    "notes" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MonitoringEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringEntry_publicId_key" ON "MonitoringEntry"("publicId");

-- CreateIndex
CREATE INDEX "MonitoringEntry_motherId_archivedAt_recordedAt_idx" ON "MonitoringEntry"("motherId", "archivedAt", "recordedAt");

-- CreateIndex
CREATE INDEX "MonitoringEntry_pregnancyId_archivedAt_recordedAt_idx" ON "MonitoringEntry"("pregnancyId", "archivedAt", "recordedAt");

-- CreateIndex
CREATE INDEX "MonitoringEntry_createdByUserId_idx" ON "MonitoringEntry"("createdByUserId");

-- AddForeignKey
ALTER TABLE "MonitoringEntry" ADD CONSTRAINT "MonitoringEntry_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringEntry" ADD CONSTRAINT "MonitoringEntry_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringEntry" ADD CONSTRAINT "MonitoringEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
