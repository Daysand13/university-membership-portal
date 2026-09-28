-- CreateEnum
CREATE TYPE "PushSubject" AS ENUM ('NEWS', 'EVENT', 'EVENT_CHANGED', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "push_dispatches" (
    "id" TEXT NOT NULL,
    "subject" "PushSubject" NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_dispatches_createdAt_idx" ON "push_dispatches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_dispatches_subject_entityId_key" ON "push_dispatches"("subject", "entityId");
