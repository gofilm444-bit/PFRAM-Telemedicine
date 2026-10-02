-- CreateEnum
CREATE TYPE "EducationCategory" AS ENUM ('PREGNANCY', 'NUTRITION', 'BODY_CHANGES', 'IRON_TABLET', 'NAUSEA', 'ANEMIA_KEK', 'PREPARATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationTrimester" AS ENUM ('ALL', 'TRIMESTER_1', 'TRIMESTER_2', 'TRIMESTER_3');

-- CreateTable
CREATE TABLE "EducationArticle" (
    "id" UUID NOT NULL,
    "publicId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "EducationCategory" NOT NULL,
    "trimester" "EducationTrimester" NOT NULL DEFAULT 'ALL',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sourceName" TEXT NOT NULL,
    "sourceReference" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EducationArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationArticle_publicId_key" ON "EducationArticle"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "EducationArticle_slug_key" ON "EducationArticle"("slug");

-- CreateIndex
CREATE INDEX "EducationArticle_published_archivedAt_trimester_idx" ON "EducationArticle"("published", "archivedAt", "trimester");

-- CreateIndex
CREATE INDEX "EducationArticle_category_published_idx" ON "EducationArticle"("category", "published");

-- CreateIndex
CREATE INDEX "EducationArticle_featured_published_idx" ON "EducationArticle"("featured", "published");

-- CreateIndex
CREATE INDEX "EducationArticle_slug_idx" ON "EducationArticle"("slug");
