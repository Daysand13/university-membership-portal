-- CreateEnum
CREATE TYPE "PaidDocumentKind" AS ENUM ('CV', 'ID_CARD');

-- CreateEnum
CREATE TYPE "DocumentPurchaseStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "member_cvs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "location" TEXT,
    "education" JSONB NOT NULL DEFAULT '[]',
    "experience" JSONB NOT NULL DEFAULT '[]',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "languages" JSONB NOT NULL DEFAULT '[]',
    "activities" JSONB NOT NULL DEFAULT '[]',
    "referees" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_purchases" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "PaidDocumentKind" NOT NULL,
    "amountPesewas" INTEGER NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "status" "DocumentPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "paystackTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_cvs_memberId_key" ON "member_cvs"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "document_purchases_reference_key" ON "document_purchases"("reference");

-- CreateIndex
CREATE INDEX "document_purchases_memberId_kind_status_idx" ON "document_purchases"("memberId", "kind", "status");

-- AddForeignKey
ALTER TABLE "member_cvs" ADD CONSTRAINT "member_cvs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_purchases" ADD CONSTRAINT "document_purchases_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_purchases" ADD CONSTRAINT "document_purchases_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
