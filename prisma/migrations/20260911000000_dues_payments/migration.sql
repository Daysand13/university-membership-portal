-- CreateEnum
CREATE TYPE "DuesPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "memberId" TEXT;

-- CreateTable
CREATE TABLE "dues_payments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "tierLabel" TEXT NOT NULL,
    "amountPesewas" INTEGER NOT NULL,
    "status" "DuesPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "paystackTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dues_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dues_payments_reference_key" ON "dues_payments"("reference");

-- CreateIndex
CREATE INDEX "dues_payments_memberId_idx" ON "dues_payments"("memberId");

-- CreateIndex
CREATE INDEX "dues_payments_academicYear_idx" ON "dues_payments"("academicYear");

-- CreateIndex
CREATE INDEX "dues_payments_status_idx" ON "dues_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_memberId_key" ON "team_members"("memberId");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dues_payments" ADD CONSTRAINT "dues_payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

