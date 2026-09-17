-- CreateEnum
CREATE TYPE "DocumentAudience" AS ENUM ('PUBLIC', 'PATRONS');

-- CreateEnum
CREATE TYPE "DonationFund" AS ENUM ('GENERAL', 'ASSISTIVE_TECHNOLOGY', 'EMERGENCY_WELFARE', 'ADVOCACY_LEGAL');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "DonationSource" AS ENUM ('ONLINE', 'RECORDED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('STUDENT_WELFARE', 'EVENTS', 'ASSISTIVE_TECHNOLOGY', 'ADVOCACY', 'ADMINISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL_MEMBERS', 'STUDENTS', 'ALUMNI', 'EXECUTIVES');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PatronThreadStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PatronMessageSender" AS ENUM ('PATRON', 'ADMIN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'PATRON_ACTION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('EXAMINATION_VENUES', 'LEARNING_MATERIALS', 'PHYSICAL_ACCESS', 'ASSISTIVE_TECHNOLOGY', 'ACCOMMODATION', 'DISCRIMINATION', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueActionType" AS ENUM ('MEETING_REQUEST', 'OFFICIAL_STATEMENT');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "audience" "DocumentAudience" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "uploadedByPatronId" TEXT;

-- AlterTable
ALTER TABLE "patron_profiles" ADD COLUMN     "notificationsSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "patronId" TEXT,
    "donorName" TEXT NOT NULL,
    "donorEmail" TEXT,
    "fund" "DonationFund" NOT NULL DEFAULT 'GENERAL',
    "amountPesewas" INTEGER NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "source" "DonationSource" NOT NULL DEFAULT 'ONLINE',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "paystackTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountPesewas" INTEGER NOT NULL,
    "spentOn" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" TEXT NOT NULL,
    "patronId" TEXT,
    "authorName" TEXT NOT NULL,
    "audience" "BroadcastAudience" NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "postToPortal" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "attachmentMime" TEXT,
    "attachmentSize" INTEGER,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER,
    "emailsSent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patron_threads" (
    "id" TEXT NOT NULL,
    "patronId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "addressedTo" TEXT NOT NULL,
    "status" "PatronThreadStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadByPatron" BOOLEAN NOT NULL DEFAULT false,
    "unreadByAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patron_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patron_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sender" "PatronMessageSender" NOT NULL,
    "adminId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patron_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advocacy_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "initiatedBy" TEXT,
    "targetBody" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advocacy_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_endorsements" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patronId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessibility_issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "location" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reportedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessibility_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_patron_actions" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "patronId" TEXT NOT NULL,
    "type" "IssueActionType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_patron_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "donations_reference_key" ON "donations"("reference");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_patronId_idx" ON "donations"("patronId");

-- CreateIndex
CREATE INDEX "donations_paidAt_idx" ON "donations"("paidAt");

-- CreateIndex
CREATE INDEX "expenses_spentOn_idx" ON "expenses"("spentOn");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "broadcasts_status_idx" ON "broadcasts"("status");

-- CreateIndex
CREATE INDEX "broadcasts_patronId_idx" ON "broadcasts"("patronId");

-- CreateIndex
CREATE INDEX "broadcasts_sentAt_idx" ON "broadcasts"("sentAt");

-- CreateIndex
CREATE INDEX "patron_threads_patronId_idx" ON "patron_threads"("patronId");

-- CreateIndex
CREATE INDEX "patron_threads_lastMessageAt_idx" ON "patron_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "patron_threads_unreadByAdmin_idx" ON "patron_threads"("unreadByAdmin");

-- CreateIndex
CREATE INDEX "patron_messages_threadId_createdAt_idx" ON "patron_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "advocacy_campaigns_status_idx" ON "advocacy_campaigns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_endorsements_campaignId_patronId_key" ON "campaign_endorsements"("campaignId", "patronId");

-- CreateIndex
CREATE INDEX "accessibility_issues_status_idx" ON "accessibility_issues"("status");

-- CreateIndex
CREATE INDEX "issue_patron_actions_issueId_idx" ON "issue_patron_actions"("issueId");

-- CreateIndex
CREATE INDEX "documents_audience_idx" ON "documents"("audience");

-- CreateIndex
CREATE INDEX "documents_uploadedByPatronId_idx" ON "documents"("uploadedByPatronId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedByPatronId_fkey" FOREIGN KEY ("uploadedByPatronId") REFERENCES "patron_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patron_threads" ADD CONSTRAINT "patron_threads_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patron_messages" ADD CONSTRAINT "patron_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "patron_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patron_messages" ADD CONSTRAINT "patron_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advocacy_campaigns" ADD CONSTRAINT "advocacy_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_endorsements" ADD CONSTRAINT "campaign_endorsements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "advocacy_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_endorsements" ADD CONSTRAINT "campaign_endorsements_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessibility_issues" ADD CONSTRAINT "accessibility_issues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_patron_actions" ADD CONSTRAINT "issue_patron_actions_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "accessibility_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_patron_actions" ADD CONSTRAINT "issue_patron_actions_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The library category the quarterly balance sheets are filed under, which
-- the Finances page of the Patrons' Portal lists. Skipped if a category
-- with this name or slug already exists.
INSERT INTO "document_categories" ("id", "name", "slug")
VALUES ('doccat_financial_reports', 'Financial Reports', 'financial-reports')
ON CONFLICT DO NOTHING;
