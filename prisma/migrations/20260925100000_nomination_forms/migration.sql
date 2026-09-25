-- AlterEnum
ALTER TYPE "PaidDocumentKind" ADD VALUE 'NOMINATION_FORM';

-- AlterTable
ALTER TABLE "election_positions" ADD COLUMN     "nominationFeePesewas" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "election_candidates" ADD COLUMN     "supportingName" TEXT,
ADD COLUMN     "supportingUrl" TEXT,
ADD COLUMN     "usedPortalCv" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "election_vote_choices" ADD COLUMN     "approve" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "document_purchases" ADD COLUMN     "positionId" TEXT;

-- AddForeignKey
ALTER TABLE "document_purchases" ADD CONSTRAINT "document_purchases_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "election_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
