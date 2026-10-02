-- CreateTable
CREATE TABLE "P4kPlan" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "deliveryFacilityId" UUID,
    "customDeliveryFacilityName" TEXT,
    "deliveryAttendant" TEXT NOT NULL DEFAULT 'BIDAN',
    "birthCompanionName" TEXT,
    "birthCompanionPhone" TEXT,
    "transportation" TEXT,
    "fundingSource" TEXT,
    "bpjsNumber" TEXT,
    "bloodDonors" JSONB,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "preparationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "P4kPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P4kChecklistItem" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "p4kPlanId" UUID NOT NULL,
    "itemKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P4kChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPlan" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "motherId" UUID NOT NULL,
    "pregnancyId" UUID NOT NULL,
    "sourceFacilityId" UUID,
    "customSourceFacilityName" TEXT,
    "destinationFacilityId" UUID,
    "customDestinationFacilityName" TEXT,
    "transportType" TEXT NOT NULL DEFAULT 'AMBULANCE',
    "transportOperatorName" TEXT,
    "transportContactNumber" TEXT,
    "estimatedTravelTimeMinutes" INTEGER,
    "manualDepartureSchedule" TEXT,
    "departurePoint" TEXT,
    "companions" TEXT,
    "rtkName" TEXT,
    "rtkAddress" TEXT,
    "rtkPhone" TEXT,
    "alternativeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "P4kPlan_publicId_key" ON "P4kPlan"("publicId");
CREATE UNIQUE INDEX "P4kPlan_pregnancyId_key" ON "P4kPlan"("pregnancyId");
CREATE INDEX "P4kPlan_motherId_pregnancyId_idx" ON "P4kPlan"("motherId", "pregnancyId");

-- CreateIndex
CREATE UNIQUE INDEX "P4kChecklistItem_publicId_key" ON "P4kChecklistItem"("publicId");
CREATE INDEX "P4kChecklistItem_p4kPlanId_sortOrder_idx" ON "P4kChecklistItem"("p4kPlanId", "sortOrder");
CREATE UNIQUE INDEX "P4kChecklistItem_p4kPlanId_itemKey_key" ON "P4kChecklistItem"("p4kPlanId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPlan_publicId_key" ON "ReferralPlan"("publicId");
CREATE UNIQUE INDEX "ReferralPlan_pregnancyId_key" ON "ReferralPlan"("pregnancyId");
CREATE INDEX "ReferralPlan_motherId_pregnancyId_idx" ON "ReferralPlan"("motherId", "pregnancyId");

-- AddForeignKey
ALTER TABLE "P4kPlan" ADD CONSTRAINT "P4kPlan_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "P4kPlan" ADD CONSTRAINT "P4kPlan_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "P4kPlan" ADD CONSTRAINT "P4kPlan_deliveryFacilityId_fkey" FOREIGN KEY ("deliveryFacilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P4kChecklistItem" ADD CONSTRAINT "P4kChecklistItem_p4kPlanId_fkey" FOREIGN KEY ("p4kPlanId") REFERENCES "P4kPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPlan" ADD CONSTRAINT "ReferralPlan_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "MotherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralPlan" ADD CONSTRAINT "ReferralPlan_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "Pregnancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralPlan" ADD CONSTRAINT "ReferralPlan_sourceFacilityId_fkey" FOREIGN KEY ("sourceFacilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralPlan" ADD CONSTRAINT "ReferralPlan_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "HealthFacility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
