-- CreateEnum
CREATE TYPE "SignatureKind" AS ENUM ('NONE', 'DRAWN', 'TYPED');

-- AlterTable
ALTER TABLE "member_cvs" ADD COLUMN     "alumniProfileId" TEXT,
ADD COLUMN     "signatureData" TEXT,
ADD COLUMN     "signatureKind" "SignatureKind" NOT NULL DEFAULT 'NONE',
ALTER COLUMN "memberId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "document_purchases" ADD COLUMN     "alumniProfileId" TEXT,
ADD COLUMN     "validUntil" TIMESTAMP(3),
ALTER COLUMN "memberId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "member_cvs_alumniProfileId_key" ON "member_cvs"("alumniProfileId");

-- CreateIndex
CREATE INDEX "document_purchases_alumniProfileId_kind_status_idx" ON "document_purchases"("alumniProfileId", "kind", "status");

-- AddForeignKey
ALTER TABLE "member_cvs" ADD CONSTRAINT "member_cvs_alumniProfileId_fkey" FOREIGN KEY ("alumniProfileId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_purchases" ADD CONSTRAINT "document_purchases_alumniProfileId_fkey" FOREIGN KEY ("alumniProfileId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
