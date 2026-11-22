-- AlterTable
ALTER TABLE "mentorship_sessions" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "mentorship_calls" (
    "id" TEXT NOT NULL,
    "mentorshipId" TEXT NOT NULL,
    "sessionId" TEXT,
    "startedBy" "MentorshipSender" NOT NULL,
    "withVideo" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "mentorship_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentorship_calls_mentorshipId_startedAt_idx" ON "mentorship_calls"("mentorshipId", "startedAt");

-- CreateIndex
CREATE INDEX "mentorship_sessions_status_scheduledFor_idx" ON "mentorship_sessions"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "mentorship_calls" ADD CONSTRAINT "mentorship_calls_mentorshipId_fkey" FOREIGN KEY ("mentorshipId") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

