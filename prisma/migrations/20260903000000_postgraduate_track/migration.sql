-- Adds applicationTrack (Undergraduate / Postgraduate) and degreeCategory
-- (postgraduate degree category, e.g. M.Ed., Ph.D.) to members and
-- membership_applications, so the two enrollment tracks can be told apart.

CREATE TYPE "ApplicationTrack" AS ENUM ('UNDERGRADUATE', 'POSTGRADUATE');

ALTER TABLE "members" ADD COLUMN "applicationTrack" "ApplicationTrack";
ALTER TABLE "members" ADD COLUMN "degreeCategory" TEXT;

ALTER TABLE "membership_applications" ADD COLUMN "applicationTrack" "ApplicationTrack";
ALTER TABLE "membership_applications" ADD COLUMN "degreeCategory" TEXT;
