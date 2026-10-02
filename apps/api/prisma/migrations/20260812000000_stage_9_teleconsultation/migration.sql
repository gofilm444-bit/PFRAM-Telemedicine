-- CreateEnum
CREATE TYPE "ConsultationAttentionFlag" AS ENUM ('NORMAL', 'NEEDS_ATTENTION');

-- CreateEnum
CREATE TYPE "ConsultationMessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE');

-- CreateEnum
CREATE TYPE "ConsultationSenderRole" AS ENUM ('MOTHER', 'MIDWIFE');

-- CreateEnum
CREATE TYPE "ConsultationThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- DropForeignKey
ALTER TABLE "AncSchedule" DROP CONSTRAINT "AncSchedule_motherId_fkey";

-- DropForeignKey
ALTER TABLE "AncSchedule" DROP CONSTRAINT "AncSchedule_pregnancyId_fkey";

-- DropForeignKey
ALTER TABLE "MotherReminderSettings" DROP CONSTRAINT "MotherReminderSettings_motherId_fkey";

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_ancScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_motherId_fkey";

-- DropForeignKey
ALTER TABLE "Reminder" DROP CONSTRAINT "Reminder_pregnancyId_fkey";

-- DropIndex
DROP INDEX "AncSchedule_motherId_archivedAt_scheduledAt_idx";

-- DropIndex
DROP INDEX "AncSchedule_pregnancyId_archivedAt_scheduledAt_idx";

-- DropIndex
DROP INDEX "AncSchedule_status_scheduledAt_idx";

-- DropIndex
DROP INDEX "MotherReminderSettings_motherId_idx";

-- DropIndex
DROP INDEX "Reminder_ancScheduleId_idx";

-- DropIndex
DROP INDEX "Reminder_motherId_archivedAt_scheduledAt_idx";

-- DropIndex
DROP INDEX "Reminder_motherId_type_status_idx";

-- AlterTable
ALTER TABLE "AncSchedule" ADD COLUMN     "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "MidwifeProfile" ADD COLUMN     "estimatedResponseMinutes" INTEGER DEFAULT 60,
ADD COLUMN     "serviceEndTime" TEXT DEFAULT '16:00',
ADD COLUMN     "serviceStartTime" TEXT DEFAULT '08:00';

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "archivedAt",
ADD COLUMN     "snoozeCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "reminderTime" SET DEFAULT '20:00';

-- CreateTable
CREATE TABLE "ConsultationAttachment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "fileType" "ConsultationMessageType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "senderRole" "ConsultationSenderRole" NOT NULL,
    "senderUserId" UUID NOT NULL,
    "messageType" "ConsultationMessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationThread" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "motherId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "status" "ConsultationThreadStatus" NOT NULL DEFAULT 'OPEN',
    "attentionFlag" "ConsultationAttentionFlag" NOT NULL DEFAULT 'NORMAL',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultationThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationAttachment_publicId_key" ON "ConsultationAttachment"("publicId");

-- CreateIndex
CREATE INDEX "ConsultationAttachment_messageId_idx" ON "ConsultationAttachment"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationMessage_publicId_key" ON "ConsultationMessage"("publicId");

-- CreateIndex
CREATE INDEX "ConsultationMessage_threadId_createdAt_idx" ON "ConsultationMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultationMessage_threadId_readAt_idx" ON "ConsultationMessage"("threadId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationThread_publicId_key" ON "ConsultationThread"("publicId");

-- CreateIndex
CREATE INDEX "ConsultationThread_midwifeId_status_attentionFlag_idx" ON "ConsultationThread"("midwifeId", "status", "attentionFlag");

-- CreateIndex
CREATE INDEX "ConsultationThread_motherId_status_idx" ON "ConsultationThread"("motherId", "status");

-- CreateIndex
CREATE INDEX "ConsultationThread_pregnancyId_idx" ON "ConsultationThread"("pregnancyId");

-- CreateIndex
CREATE INDEX "AncSchedule_motherId_status_scheduledAt_idx" ON "AncSchedule"("motherId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AncSchedule_pregnancyId_status_idx" ON "AncSchedule"("pregnancyId", "status");

-- CreateIndex
CREATE INDEX "AncSchedule_scheduledAt_idx" ON "AncSchedule"("scheduledAt");

-- CreateIndex
CREATE INDEX "Reminder_motherId_scheduledAt_status_idx" ON "Reminder"("motherId", "scheduledAt", "status");

-- CreateIndex
CREATE INDEX "Reminder_type_status_scheduledAt_idx" ON "Reminder"("type", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationAttachment" ADD CONSTRAINT "ConsultationAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ConsultationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConsultationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationThread" ADD CONSTRAINT "ConsultationThread_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationThread" ADD CONSTRAINT "ConsultationThread_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationThread" ADD CONSTRAINT "ConsultationThread_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherReminderSettings" ADD CONSTRAINT "MotherReminderSettings_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_ancScheduleId_fkey" FOREIGN KEY ("ancScheduleId") REFERENCES "AncSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
