-- CreateEnum
CREATE TYPE "AncVisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AncVisitType" AS ENUM ('ANC', 'DOCTOR_ANC');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('ANC_VISIT', 'IRON_TABLET');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'COMPLETED', 'SNOOZED', 'MISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AncSchedule" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "facilityId" UUID,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "visitType" "AncVisitType" NOT NULL DEFAULT 'ANC',
    "doctorRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "AncVisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AncSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID,
    "ancScheduleId" UUID,
    "type" "ReminderType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "reminderTime" TEXT NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotherReminderSettings" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "ironTabletEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ironTabletTime" TEXT NOT NULL DEFAULT '20:00',
    "ancReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ancReminderDaysBefore" INTEGER NOT NULL DEFAULT 1,
    "ancReminderTime" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotherReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AncRuleSet" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minimumVisits" INTEGER NOT NULL DEFAULT 6,
    "minimumDoctorVisits" INTEGER NOT NULL DEFAULT 2,
    "trimesterDistribution" JSONB NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AncRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AncSchedule_publicId_key" ON "AncSchedule"("publicId");

-- CreateIndex
CREATE INDEX "AncSchedule_motherId_archivedAt_scheduledAt_idx" ON "AncSchedule"("motherId", "archivedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "AncSchedule_pregnancyId_archivedAt_scheduledAt_idx" ON "AncSchedule"("pregnancyId", "archivedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "AncSchedule_status_scheduledAt_idx" ON "AncSchedule"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AncSchedule_createdByUserId_idx" ON "AncSchedule"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_publicId_key" ON "Reminder"("publicId");

-- CreateIndex
CREATE INDEX "Reminder_motherId_archivedAt_scheduledAt_idx" ON "Reminder"("motherId", "archivedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "Reminder_motherId_type_status_idx" ON "Reminder"("motherId", "type", "status");

-- CreateIndex
CREATE INDEX "Reminder_ancScheduleId_idx" ON "Reminder"("ancScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "MotherReminderSettings_publicId_key" ON "MotherReminderSettings"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "MotherReminderSettings_motherId_key" ON "MotherReminderSettings"("motherId");

-- CreateIndex
CREATE INDEX "MotherReminderSettings_motherId_idx" ON "MotherReminderSettings"("motherId");

-- CreateIndex
CREATE UNIQUE INDEX "AncRuleSet_publicId_key" ON "AncRuleSet"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "AncRuleSet_version_key" ON "AncRuleSet"("version");

-- CreateIndex
CREATE INDEX "AncRuleSet_active_effectiveFrom_idx" ON "AncRuleSet"("active", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AncSchedule" ADD CONSTRAINT "AncSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_ancScheduleId_fkey" FOREIGN KEY ("ancScheduleId") REFERENCES "AncSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherReminderSettings" ADD CONSTRAINT "MotherReminderSettings_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
