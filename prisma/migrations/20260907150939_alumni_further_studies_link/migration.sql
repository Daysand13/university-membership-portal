-- DropForeignKey
ALTER TABLE "alumni_password_reset_tokens" DROP CONSTRAINT "alumni_password_reset_tokens_alumniId_fkey";

-- DropForeignKey
ALTER TABLE "alumni_profiles" DROP CONSTRAINT "alumni_profiles_sourceMemberId_fkey";

-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "submittedByAlumniId" TEXT;

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_submittedByAlumniId_fkey" FOREIGN KEY ("submittedByAlumniId") REFERENCES "alumni_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_sourceMemberId_fkey" FOREIGN KEY ("sourceMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_password_reset_tokens" ADD CONSTRAINT "alumni_password_reset_tokens_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
