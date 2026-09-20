-- AlterEnum
ALTER TYPE "SoftwareRequestStatus" ADD VALUE 'UNFULFILLABLE';

-- AlterTable
ALTER TABLE "software_requests" ADD COLUMN     "resourceLink" TEXT;
