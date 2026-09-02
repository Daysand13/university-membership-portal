-- Adds academicDepartment, hallOfAffiliation, specificSupportNeeds to
-- members and membership_applications, and converts membershipType from
-- free text to a proper enum (Regular / Distance / Sandwich).
--
-- Defensive: normalizes any old-format membershipType values (e.g. the
-- word "Regular" instead of "REGULAR") before converting the column type,
-- so the migration can't fail on data left over from an earlier version of
-- the app. Anything that still doesn't match a known value is set to NULL
-- rather than blocking the migration.

CREATE TYPE "MembershipType" AS ENUM ('REGULAR', 'DISTANCE', 'SANDWICH');

UPDATE "members" SET "membershipType" = UPPER(TRIM("membershipType"));
UPDATE "members" SET "membershipType" = NULL
  WHERE "membershipType" IS NOT NULL AND "membershipType" NOT IN ('REGULAR', 'DISTANCE', 'SANDWICH');

UPDATE "membership_applications" SET "membershipType" = UPPER(TRIM("membershipType"));
UPDATE "membership_applications" SET "membershipType" = NULL
  WHERE "membershipType" IS NOT NULL AND "membershipType" NOT IN ('REGULAR', 'DISTANCE', 'SANDWICH');

ALTER TABLE "members" ADD COLUMN "academicDepartment" TEXT;
ALTER TABLE "members" ADD COLUMN "hallOfAffiliation" TEXT;
ALTER TABLE "members" ADD COLUMN "specificSupportNeeds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "members" ALTER COLUMN "membershipType" DROP DEFAULT;
ALTER TABLE "members" ALTER COLUMN "membershipType" TYPE "MembershipType" USING NULLIF("membershipType", '')::"MembershipType";

ALTER TABLE "membership_applications" ADD COLUMN "academicDepartment" TEXT;
ALTER TABLE "membership_applications" ADD COLUMN "hallOfAffiliation" TEXT;
ALTER TABLE "membership_applications" ADD COLUMN "specificSupportNeeds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "membership_applications" ALTER COLUMN "membershipType" DROP DEFAULT;
ALTER TABLE "membership_applications" ALTER COLUMN "membershipType" TYPE "MembershipType" USING NULLIF("membershipType", '')::"MembershipType";
