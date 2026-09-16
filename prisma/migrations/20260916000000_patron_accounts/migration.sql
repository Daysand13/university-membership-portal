-- CreateEnum
CREATE TYPE "PatronStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "patron_profiles" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "organization" TEXT,
    "jobTitle" TEXT,
    "address" TEXT,
    "region" TEXT,
    "supportInterest" TEXT,
    "motivation" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "PatronStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patron_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patron_profiles_email_key" ON "patron_profiles"("email");

-- CreateIndex
CREATE INDEX "patron_profiles_status_idx" ON "patron_profiles"("status");

-- CreateIndex
CREATE INDEX "patron_profiles_submittedAt_idx" ON "patron_profiles"("submittedAt");

-- AddForeignKey
ALTER TABLE "patron_profiles" ADD CONSTRAINT "patron_profiles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
