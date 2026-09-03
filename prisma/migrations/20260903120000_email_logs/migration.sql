-- Adds an email_logs table so every transactional email attempt (approval,
-- rejection, password reset, profile update confirmation, etc.) is
-- recorded for auditing — who it was sent to, which template, whether it
-- actually sent or failed, and how many attempts it took.

CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED_NO_PROVIDER');

CREATE TABLE "email_logs" (
  "id" TEXT PRIMARY KEY,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "status" "EmailStatus" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "errorMessage" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX "email_logs_to_idx" ON "email_logs"("to");
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
CREATE INDEX "email_logs_entityType_entityId_idx" ON "email_logs"("entityType", "entityId");
