-- CreateEnum
CREATE TYPE "HomeVisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "HomeVisitSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "motherId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "pregnancyId" UUID,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "status" "HomeVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" UUID NOT NULL,

    CONSTRAINT "HomeVisitSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeVisitSchedule_publicId_key" ON "HomeVisitSchedule"("publicId");

-- CreateIndex
CREATE INDEX "HomeVisitSchedule_midwifeId_scheduledAt_status_idx" ON "HomeVisitSchedule"("midwifeId", "scheduledAt", "status");

-- CreateIndex
CREATE INDEX "HomeVisitSchedule_motherId_scheduledAt_idx" ON "HomeVisitSchedule"("motherId", "scheduledAt");

-- CreateIndex
CREATE INDEX "HomeVisitSchedule_pregnancyId_status_idx" ON "HomeVisitSchedule"("pregnancyId", "status");

-- AddForeignKey
ALTER TABLE "HomeVisitSchedule" ADD CONSTRAINT "HomeVisitSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVisitSchedule" ADD CONSTRAINT "HomeVisitSchedule_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVisitSchedule" ADD CONSTRAINT "HomeVisitSchedule_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVisitSchedule" ADD CONSTRAINT "HomeVisitSchedule_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
