-- AlterTable
ALTER TABLE "alumni_profiles" ADD COLUMN     "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currentOrganization" TEXT,
ADD COLUMN     "currentPosition" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "publicProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "twitterUrl" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "alumni_spotlights" (
    "id" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "story" TEXT,
    "imageUrl" TEXT,
    "category" TEXT,
    "quote" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_spotlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_page_content" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "heroKicker" TEXT NOT NULL DEFAULT 'Alumni Network',
    "heroTitle" TEXT NOT NULL DEFAULT 'Our Proud Alumni',
    "heroDescription" TEXT NOT NULL DEFAULT 'Our alumni continue to make meaningful contributions across their professions, communities, and the world. Discover the people who represent the impact of our association beyond graduation.',
    "heroImageUrl" TEXT,
    "showcaseTitle" TEXT NOT NULL DEFAULT 'Our Proud Alumni',
    "showcaseDescription" TEXT NOT NULL DEFAULT 'Graduates of the association making an impact in their fields.',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_page_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumni_spotlights_alumniId_key" ON "alumni_spotlights"("alumniId");

-- CreateIndex
CREATE INDEX "alumni_spotlights_published_displayOrder_idx" ON "alumni_spotlights"("published", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_publicSlug_key" ON "alumni_profiles"("publicSlug");

-- CreateIndex
CREATE INDEX "alumni_profiles_publicProfile_idx" ON "alumni_profiles"("publicProfile");

-- AddForeignKey
ALTER TABLE "alumni_spotlights" ADD CONSTRAINT "alumni_spotlights_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

