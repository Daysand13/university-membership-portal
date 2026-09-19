-- CreateEnum
CREATE TYPE "AllyType" AS ENUM ('INDIVIDUAL', 'CORPORATE');

-- CreateEnum
CREATE TYPE "AllySignupStatus" AS ENUM ('NEW', 'REVIEWED', 'LISTED');

-- CreateEnum
CREATE TYPE "SoftwareCategory" AS ENUM ('VISION', 'HEARING', 'COGNITIVE', 'MOBILITY');

-- CreateEnum
CREATE TYPE "SoftwareRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'FULFILLED', 'DECLINED');

-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'ALLIES';

-- CreateTable
CREATE TABLE "allies" (
    "id" TEXT NOT NULL,
    "type" "AllyType" NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "role" TEXT,
    "organization" TEXT,
    "sector" TEXT,
    "statement" TEXT,
    "spotlightQuote" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "signupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ally_signups" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "AllyType" NOT NULL,
    "organization" TEXT,
    "wantsListing" BOOLEAN NOT NULL DEFAULT false,
    "status" "AllySignupStatus" NOT NULL DEFAULT 'NEW',
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ally_signups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistive_software" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "category" "SoftwareCategory" NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "telegramUrl" TEXT,
    "websiteUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistive_software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "softwareName" TEXT NOT NULL,
    "category" "SoftwareCategory" NOT NULL,
    "operatingSystem" TEXT NOT NULL,
    "notes" TEXT,
    "memberId" TEXT,
    "status" "SoftwareRequestStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_prior_programmes" (
    "id" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "yearCompleted" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_prior_programmes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allies_signupId_key" ON "allies"("signupId");

-- CreateIndex
CREATE INDEX "allies_type_isActive_idx" ON "allies"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ally_signups_email_key" ON "ally_signups"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ally_signups_token_key" ON "ally_signups"("token");

-- CreateIndex
CREATE INDEX "ally_signups_status_idx" ON "ally_signups"("status");

-- CreateIndex
CREATE INDEX "ally_signups_confirmedAt_idx" ON "ally_signups"("confirmedAt");

-- CreateIndex
CREATE INDEX "assistive_software_category_isActive_idx" ON "assistive_software"("category", "isActive");

-- CreateIndex
CREATE INDEX "software_requests_status_idx" ON "software_requests"("status");

-- CreateIndex
CREATE INDEX "alumni_prior_programmes_alumniId_idx" ON "alumni_prior_programmes"("alumniId");

-- AddForeignKey
ALTER TABLE "allies" ADD CONSTRAINT "allies_signupId_fkey" FOREIGN KEY ("signupId") REFERENCES "ally_signups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_requests" ADD CONSTRAINT "software_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_requests" ADD CONSTRAINT "software_requests_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_prior_programmes" ADD CONSTRAINT "alumni_prior_programmes_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
