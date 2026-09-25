-- AlterEnum
ALTER TYPE "PaidDocumentKind" ADD VALUE 'LETTER';

-- AlterTable
ALTER TABLE "document_purchases" ADD COLUMN     "letterId" TEXT;

-- CreateTable
CREATE TABLE "member_letters" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "alumniProfileId" TEXT,
    "title" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAddress" TEXT,
    "senderPhone" TEXT,
    "senderEmail" TEXT,
    "letterDate" TIMESTAMP(3),
    "recipientName" TEXT,
    "recipientTitle" TEXT,
    "recipientOrganisation" TEXT,
    "recipientAddress" TEXT,
    "salutation" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "closing" TEXT NOT NULL,
    "signatureKind" "SignatureKind" NOT NULL DEFAULT 'NONE',
    "signatureData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_letters_memberId_idx" ON "member_letters"("memberId");

-- CreateIndex
CREATE INDEX "member_letters_alumniProfileId_idx" ON "member_letters"("alumniProfileId");

-- AddForeignKey
ALTER TABLE "member_letters" ADD CONSTRAINT "member_letters_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_letters" ADD CONSTRAINT "member_letters_alumniProfileId_fkey" FOREIGN KEY ("alumniProfileId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_purchases" ADD CONSTRAINT "document_purchases_letterId_fkey" FOREIGN KEY ("letterId") REFERENCES "member_letters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
