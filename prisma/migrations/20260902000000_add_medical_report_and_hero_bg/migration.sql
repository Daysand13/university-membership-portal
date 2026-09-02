-- Remove facultySchool, add medicalReportUrl to members and membership_applications;
-- add backgroundColor to hero_slides.

ALTER TABLE "members" DROP COLUMN "facultySchool";
ALTER TABLE "members" ADD COLUMN "medicalReportUrl" TEXT;

ALTER TABLE "membership_applications" DROP COLUMN "facultySchool";
ALTER TABLE "membership_applications" ADD COLUMN "medicalReportUrl" TEXT;

ALTER TABLE "hero_slides" ADD COLUMN "backgroundColor" TEXT;
