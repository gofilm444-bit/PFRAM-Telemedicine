-- CreateEnum
CREATE TYPE "VideoConsultationStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VideoConsultation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "motherId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "consultationThreadId" UUID,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" "VideoConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "VideoConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoConsultation_publicId_key" ON "VideoConsultation"("publicId");

-- CreateIndex
CREATE INDEX "VideoConsultation_consultationThreadId_idx" ON "VideoConsultation"("consultationThreadId");

-- CreateIndex
CREATE INDEX "VideoConsultation_midwifeId_status_scheduledAt_idx" ON "VideoConsultation"("midwifeId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "VideoConsultation_motherId_status_scheduledAt_idx" ON "VideoConsultation"("motherId", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "VideoConsultation" ADD CONSTRAINT "VideoConsultation_consultationThreadId_fkey" FOREIGN KEY ("consultationThreadId") REFERENCES "ConsultationThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoConsultation" ADD CONSTRAINT "VideoConsultation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoConsultation" ADD CONSTRAINT "VideoConsultation_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoConsultation" ADD CONSTRAINT "VideoConsultation_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoConsultation" ADD CONSTRAINT "VideoConsultation_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
