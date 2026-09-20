-- CreateEnum
CREATE TYPE "TechRequestKind" AS ENUM ('SOFTWARE', 'TUTORIAL');

-- CreateEnum
CREATE TYPE "TutorialSource" AS ENUM ('YOUTUBE', 'TIKTOK');

-- AlterTable
ALTER TABLE "software_requests" ADD COLUMN     "kind" "TechRequestKind" NOT NULL DEFAULT 'SOFTWARE',
ALTER COLUMN "operatingSystem" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tutorials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" "TutorialSource" NOT NULL,
    "url" TEXT NOT NULL,
    "videoId" TEXT,
    "thumbnailUrl" TEXT,
    "category" "SoftwareCategory",
    "durationLabel" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutorials_isActive_order_idx" ON "tutorials"("isActive", "order");
