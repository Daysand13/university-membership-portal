-- Adds membershipEligibility and partnersStakeholders to about_content, and
-- a new team_members table used for both Executive Leadership and Our
-- Patrons sections on the About page.

CREATE TYPE "TeamMemberType" AS ENUM ('LEADERSHIP', 'PATRON');

ALTER TABLE "about_content" ADD COLUMN "membershipEligibility" TEXT;
ALTER TABLE "about_content" ADD COLUMN "partnersStakeholders" TEXT;

CREATE TABLE "team_members" (
  "id" TEXT PRIMARY KEY,
  "type" "TeamMemberType" NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "photoUrl" TEXT,
  "bio" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "team_members_type_idx" ON "team_members"("type");
