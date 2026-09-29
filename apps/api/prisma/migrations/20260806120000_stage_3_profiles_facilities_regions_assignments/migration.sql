-- CreateEnum
CREATE TYPE "RegionLevel" AS ENUM ('PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE');

-- CreateEnum
CREATE TYPE "HealthFacilityType" AS ENUM ('PUSKESMAS', 'HOSPITAL', 'CLINIC', 'INDEPENDENT_MIDWIFE', 'REFERRAL_FACILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "GestationalAgeSource" AS ENUM ('LMP', 'HEALTH_WORKER_ASSESSMENT');

-- CreateEnum
CREATE TYPE "PregnancyType" AS ENUM ('SINGLETON', 'MULTIPLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PregnancyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DELIVERY', 'MISCARRIAGE', 'REFERRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'REPLACED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "AdminProfile" DROP CONSTRAINT "AdminProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "MidwifeProfile" DROP CONSTRAINT "MidwifeProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "MotherProfile" DROP CONSTRAINT "MotherProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshSession" DROP CONSTRAINT "RefreshSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserConsent" DROP CONSTRAINT "UserConsent_documentId_fkey";

-- DropForeignKey
ALTER TABLE "UserConsent" DROP CONSTRAINT "UserConsent_userId_fkey";

-- AlterTable
ALTER TABLE "MidwifeProfile" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "position" TEXT,
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "primaryFacilityId" UUID,
ADD COLUMN     "professionalRegistrationNumber" TEXT,
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicId" UUID,
ADD COLUMN     "serviceHours" JSONB,
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "MotherProfile" ADD COLUMN     "address" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "districtId" UUID,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "familyContactName" TEXT,
ADD COLUMN     "familyContactPhone" TEXT,
ADD COLUMN     "primaryFacilityId" UUID,
ADD COLUMN     "provinceId" UUID,
ADD COLUMN     "publicId" UUID,
ADD COLUMN     "regencyId" UUID,
ADD COLUMN     "villageId" UUID,
ALTER COLUMN "dateOfBirth" SET DATA TYPE DATE;

-- Backfill public IDs for profiles created by the previous stage before making
-- the columns required. gen_random_uuid() is provided by supported PostgreSQL.
UPDATE "MidwifeProfile" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
UPDATE "MotherProfile" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "MidwifeProfile" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "MotherProfile" ALTER COLUMN "publicId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Region" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "level" "RegionLevel" NOT NULL,
    "parentId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthFacility" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HealthFacilityType" NOT NULL,
    "address" TEXT NOT NULL,
    "provinceId" UUID NOT NULL,
    "regencyId" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "villageId" UUID,
    "phoneNumber" TEXT,
    "whatsappNumber" TEXT,
    "emergencyPhone" TEXT,
    "openingHours" JSONB,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "serviceInformation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "HealthFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MidwifeFacilityAssignment" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MidwifeFacilityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MidwifeRegionAssignment" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "regionId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MidwifeRegionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregnancy" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyNumber" INTEGER NOT NULL,
    "lastMenstrualPeriod" DATE,
    "estimatedDueDate" DATE NOT NULL,
    "gestationalAgeSource" "GestationalAgeSource" NOT NULL,
    "assessmentDate" DATE,
    "initialGestationalAgeWeeks" INTEGER,
    "initialGestationalAgeDays" INTEGER,
    "pregnancyType" "PregnancyType" NOT NULL DEFAULT 'UNKNOWN',
    "previousPregnancyCount" INTEGER NOT NULL DEFAULT 0,
    "previousDeliveryCount" INTEGER NOT NULL DEFAULT 0,
    "miscarriageCount" INTEGER NOT NULL DEFAULT 0,
    "previousCesarean" BOOLEAN NOT NULL DEFAULT false,
    "hypertensionHistory" BOOLEAN NOT NULL DEFAULT false,
    "preeclampsiaHistory" BOOLEAN NOT NULL DEFAULT false,
    "diabetesHistory" BOOLEAN NOT NULL DEFAULT false,
    "heartDiseaseHistory" BOOLEAN NOT NULL DEFAULT false,
    "kidneyDiseaseHistory" BOOLEAN NOT NULL DEFAULT false,
    "otherDiseaseHistory" TEXT,
    "additionalNotes" TEXT,
    "status" "PregnancyStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "completedProfile" BOOLEAN NOT NULL DEFAULT false,
    "dueDateCorrectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregnancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotherMidwifeAssignment" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "midwifeId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "assignedByUserId" UUID NOT NULL,
    "replacementReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotherMidwifeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_publicId_key" ON "Region"("publicId");

-- CreateIndex
CREATE INDEX "Region_level_active_name_idx" ON "Region"("level", "active", "name");

-- CreateIndex
CREATE INDEX "Region_parentId_active_idx" ON "Region"("parentId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Region_parentId_level_name_key" ON "Region"("parentId", "level", "name");

-- CreateIndex
CREATE UNIQUE INDEX "HealthFacility_publicId_key" ON "HealthFacility"("publicId");

-- CreateIndex
CREATE INDEX "HealthFacility_active_type_name_idx" ON "HealthFacility"("active", "type", "name");

-- CreateIndex
CREATE INDEX "HealthFacility_provinceId_regencyId_districtId_idx" ON "HealthFacility"("provinceId", "regencyId", "districtId");

-- CreateIndex
CREATE UNIQUE INDEX "MidwifeFacilityAssignment_publicId_key" ON "MidwifeFacilityAssignment"("publicId");

-- CreateIndex
CREATE INDEX "MidwifeFacilityAssignment_midwifeId_active_idx" ON "MidwifeFacilityAssignment"("midwifeId", "active");

-- CreateIndex
CREATE INDEX "MidwifeFacilityAssignment_facilityId_active_idx" ON "MidwifeFacilityAssignment"("facilityId", "active");

-- Enforce one active primary facility per midwife at the database boundary.
CREATE UNIQUE INDEX "MidwifeFacilityAssignment_one_active_primary_idx" ON "MidwifeFacilityAssignment"("midwifeId") WHERE "active" = true AND "primary" = true;

-- CreateIndex
CREATE UNIQUE INDEX "MidwifeRegionAssignment_publicId_key" ON "MidwifeRegionAssignment"("publicId");

-- CreateIndex
CREATE INDEX "MidwifeRegionAssignment_midwifeId_active_idx" ON "MidwifeRegionAssignment"("midwifeId", "active");

-- CreateIndex
CREATE INDEX "MidwifeRegionAssignment_regionId_active_idx" ON "MidwifeRegionAssignment"("regionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Pregnancy_publicId_key" ON "Pregnancy"("publicId");

-- CreateIndex
CREATE INDEX "Pregnancy_motherId_status_idx" ON "Pregnancy"("motherId", "status");

-- Concurrency-safe enforcement of one active pregnancy per mother.
CREATE UNIQUE INDEX "Pregnancy_one_active_per_mother_idx" ON "Pregnancy"("motherId") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "Pregnancy_motherId_pregnancyNumber_key" ON "Pregnancy"("motherId", "pregnancyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MotherMidwifeAssignment_publicId_key" ON "MotherMidwifeAssignment"("publicId");

-- CreateIndex
CREATE INDEX "MotherMidwifeAssignment_motherId_pregnancyId_status_idx" ON "MotherMidwifeAssignment"("motherId", "pregnancyId", "status");

-- CreateIndex
CREATE INDEX "MotherMidwifeAssignment_midwifeId_status_idx" ON "MotherMidwifeAssignment"("midwifeId", "status");

-- CreateIndex
CREATE INDEX "MotherMidwifeAssignment_facilityId_status_idx" ON "MotherMidwifeAssignment"("facilityId", "status");

-- Concurrency-safe enforcement of one active assignment per active pregnancy.
CREATE UNIQUE INDEX "MotherMidwifeAssignment_one_active_idx" ON "MotherMidwifeAssignment"("motherId", "pregnancyId") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "MidwifeProfile_publicId_key" ON "MidwifeProfile"("publicId");

-- CreateIndex
CREATE INDEX "MidwifeProfile_primaryFacilityId_idx" ON "MidwifeProfile"("primaryFacilityId");

-- CreateIndex
CREATE UNIQUE INDEX "MotherProfile_publicId_key" ON "MotherProfile"("publicId");

-- CreateIndex
CREATE INDEX "MotherProfile_profileCompleted_idx" ON "MotherProfile"("profileCompleted");

-- CreateIndex
CREATE INDEX "MotherProfile_primaryFacilityId_idx" ON "MotherProfile"("primaryFacilityId");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthFacility" ADD CONSTRAINT "HealthFacility_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthFacility" ADD CONSTRAINT "HealthFacility_regencyId_fkey" FOREIGN KEY ("regencyId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthFacility" ADD CONSTRAINT "HealthFacility_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthFacility" ADD CONSTRAINT "HealthFacility_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_regencyId_fkey" FOREIGN KEY ("regencyId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherProfile" ADD CONSTRAINT "MotherProfile_primaryFacilityId_fkey" FOREIGN KEY ("primaryFacilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeProfile" ADD CONSTRAINT "MidwifeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeProfile" ADD CONSTRAINT "MidwifeProfile_primaryFacilityId_fkey" FOREIGN KEY ("primaryFacilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeFacilityAssignment" ADD CONSTRAINT "MidwifeFacilityAssignment_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeFacilityAssignment" ADD CONSTRAINT "MidwifeFacilityAssignment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeRegionAssignment" ADD CONSTRAINT "MidwifeRegionAssignment_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MidwifeRegionAssignment" ADD CONSTRAINT "MidwifeRegionAssignment_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pregnancy" ADD CONSTRAINT "Pregnancy_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherMidwifeAssignment" ADD CONSTRAINT "MotherMidwifeAssignment_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherMidwifeAssignment" ADD CONSTRAINT "MotherMidwifeAssignment_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherMidwifeAssignment" ADD CONSTRAINT "MotherMidwifeAssignment_midwifeId_fkey" FOREIGN KEY ("midwifeId") REFERENCES "MidwifeProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherMidwifeAssignment" ADD CONSTRAINT "MotherMidwifeAssignment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "HealthFacility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherMidwifeAssignment" ADD CONSTRAINT "MotherMidwifeAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ConsentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
