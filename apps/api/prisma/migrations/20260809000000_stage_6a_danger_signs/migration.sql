-- CreateEnum
CREATE TYPE "DangerScreeningStatus" AS ENUM ('NO_DANGER_REPORTED', 'DANGER_SIGN_REPORTED', 'REQUIRES_IMMEDIATE_CARE');

-- CreateEnum
CREATE TYPE "DangerFollowUpStatus" AS ENUM ('PENDING', 'CONTACTED', 'REFERRED_TO_FACILITY', 'ARRIVED_AT_FACILITY', 'RESOLVED');

-- CreateTable
CREATE TABLE "DangerSignRuleSet" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DangerSignRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DangerSignRule" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "ruleSetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "trimesterApplicability" JSONB NOT NULL,
    "question" TEXT NOT NULL,
    "severityCategory" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DangerSignRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DangerScreening" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "ruleSetVersion" TEXT NOT NULL,
    "screenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DangerScreeningStatus" NOT NULL DEFAULT 'NO_DANGER_REPORTED',
    "reportedSignsCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "followUpStatus" "DangerFollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "followUpNotes" TEXT,
    "followUpUpdatedAt" TIMESTAMP(3),
    "followedUpByUserId" UUID,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DangerScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DangerScreeningResponse" (
    "id" UUID NOT NULL,
    "screeningId" UUID NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "severityCategory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DangerScreeningResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DangerSignRuleSet_publicId_key" ON "DangerSignRuleSet"("publicId");
CREATE UNIQUE INDEX "DangerSignRuleSet_version_key" ON "DangerSignRuleSet"("version");
CREATE INDEX "DangerSignRuleSet_active_effectiveFrom_idx" ON "DangerSignRuleSet"("active", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "DangerSignRule_publicId_key" ON "DangerSignRule"("publicId");
CREATE UNIQUE INDEX "DangerSignRule_ruleSetId_code_key" ON "DangerSignRule"("ruleSetId", "code");
CREATE INDEX "DangerSignRule_ruleSetId_active_sortOrder_idx" ON "DangerSignRule"("ruleSetId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DangerScreening_publicId_key" ON "DangerScreening"("publicId");
CREATE INDEX "DangerScreening_motherId_archivedAt_screenedAt_idx" ON "DangerScreening"("motherId", "archivedAt", "screenedAt");
CREATE INDEX "DangerScreening_pregnancyId_status_idx" ON "DangerScreening"("pregnancyId", "status");
CREATE INDEX "DangerScreening_followUpStatus_status_idx" ON "DangerScreening"("followUpStatus", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DangerScreeningResponse_screeningId_ruleCode_key" ON "DangerScreeningResponse"("screeningId", "ruleCode");
CREATE INDEX "DangerScreeningResponse_screeningId_answer_idx" ON "DangerScreeningResponse"("screeningId", "answer");

-- AddForeignKey
ALTER TABLE "DangerSignRule" ADD CONSTRAINT "DangerSignRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "DangerSignRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DangerScreening" ADD CONSTRAINT "DangerScreening_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DangerScreening" ADD CONSTRAINT "DangerScreening_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DangerScreening" ADD CONSTRAINT "DangerScreening_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DangerScreening" ADD CONSTRAINT "DangerScreening_followedUpByUserId_fkey" FOREIGN KEY ("followedUpByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DangerScreeningResponse" ADD CONSTRAINT "DangerScreeningResponse_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "DangerScreening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
