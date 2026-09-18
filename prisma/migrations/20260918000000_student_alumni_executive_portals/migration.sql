-- CreateEnum
CREATE TYPE "BarrierReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportRequestType" AS ENUM ('ASSISTIVE_TECH', 'NOTE_TAKER', 'WELFARE', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DECLINED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'DECLINED', 'ENDED');

-- CreateEnum
CREATE TYPE "MentorshipSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MentorshipSender" AS ENUM ('STUDENT', 'MENTOR');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('JOB', 'INTERNSHIP', 'SCHOLARSHIP', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'PATRONS';

-- AlterTable
ALTER TABLE "alumni_profiles" ADD COLUMN     "mentorAvailability" TEXT,
ADD COLUMN     "mentorCapacity" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "alumniId" TEXT;

-- AlterTable
ALTER TABLE "broadcasts" ADD COLUMN     "createdByAdminId" TEXT;

-- AlterTable
ALTER TABLE "campaign_endorsements" ADD COLUMN     "alumniId" TEXT,
ALTER COLUMN "patronId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "barrier_reports" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "location" TEXT,
    "occurredOn" TIMESTAMP(3),
    "status" "BarrierReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "assignedToId" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "escalatedIssueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barrier_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barrier_report_attachments" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barrier_report_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barrier_report_updates" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "adminId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "BarrierReportStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barrier_report_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_requests" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "SupportRequestType" NOT NULL,
    "details" TEXT NOT NULL,
    "amountRequestedPesewas" INTEGER,
    "neededBy" TIMESTAMP(3),
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "approvedAmountPesewas" INTEGER,
    "expenseId" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "description" TEXT,
    "meetingInfo" TEXT,
    "createdByMemberId" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorships" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "alumniId" TEXT NOT NULL,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestNote" TEXT,
    "goals" TEXT,
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "endedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadByStudent" BOOLEAN NOT NULL DEFAULT false,
    "unreadByMentor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_sessions" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "topic" TEXT,
    "status" "MentorshipSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "note" TEXT,
    "bookedByStudent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorship_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_messages" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "sender" "MentorshipSender" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorship_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "alumniId" TEXT,
    "postedByName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "applyUrl" TEXT,
    "applyEmail" TEXT,
    "closingDate" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barrier_reports_escalatedIssueId_key" ON "barrier_reports"("escalatedIssueId");

-- CreateIndex
CREATE INDEX "barrier_reports_status_idx" ON "barrier_reports"("status");

-- CreateIndex
CREATE INDEX "barrier_reports_memberId_idx" ON "barrier_reports"("memberId");

-- CreateIndex
CREATE INDEX "barrier_report_attachments_reportId_idx" ON "barrier_report_attachments"("reportId");

-- CreateIndex
CREATE INDEX "barrier_report_updates_reportId_createdAt_idx" ON "barrier_report_updates"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_requests_expenseId_key" ON "support_requests"("expenseId");

-- CreateIndex
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");

-- CreateIndex
CREATE INDEX "support_requests_memberId_idx" ON "support_requests"("memberId");

-- CreateIndex
CREATE INDEX "study_groups_isOpen_idx" ON "study_groups"("isOpen");

-- CreateIndex
CREATE INDEX "study_group_members_memberId_idx" ON "study_group_members"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "study_group_members_groupId_memberId_key" ON "study_group_members"("groupId", "memberId");

-- CreateIndex
CREATE INDEX "mentorships_alumniId_status_idx" ON "mentorships"("alumniId", "status");

-- CreateIndex
CREATE INDEX "mentorships_memberId_status_idx" ON "mentorships"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mentorships_memberId_alumniId_key" ON "mentorships"("memberId", "alumniId");

-- CreateIndex
CREATE INDEX "mentorship_sessions_mentorshipId_scheduledFor_idx" ON "mentorship_sessions"("mentorshipId", "scheduledFor");

-- CreateIndex
CREATE INDEX "mentorship_messages_mentorshipId_createdAt_idx" ON "mentorship_messages"("mentorshipId", "createdAt");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_alumniId_idx" ON "opportunities"("alumniId");

-- CreateIndex
CREATE INDEX "donations_alumniId_idx" ON "donations"("alumniId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_endorsements_campaignId_alumniId_key" ON "campaign_endorsements"("campaignId", "alumniId");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_endorsements" ADD CONSTRAINT "campaign_endorsements_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_reports" ADD CONSTRAINT "barrier_reports_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_reports" ADD CONSTRAINT "barrier_reports_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_reports" ADD CONSTRAINT "barrier_reports_escalatedIssueId_fkey" FOREIGN KEY ("escalatedIssueId") REFERENCES "accessibility_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_report_attachments" ADD CONSTRAINT "barrier_report_attachments_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "barrier_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_report_updates" ADD CONSTRAINT "barrier_report_updates_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "barrier_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barrier_report_updates" ADD CONSTRAINT "barrier_report_updates_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "study_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_group_members" ADD CONSTRAINT "study_group_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_messages" ADD CONSTRAINT "mentorship_messages_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_alumniId_fkey" FOREIGN KEY ("alumniId") REFERENCES "alumni_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
