-- CreateEnum
CREATE TYPE "ElectionPhase" AS ENUM ('SCHEDULED', 'OPEN', 'POSTPONED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "noticeText" TEXT,
ADD COLUMN     "phase" "ElectionPhase" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "resultsPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "votingClosesAt" TIMESTAMP(3),
ADD COLUMN     "votingOpensAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "election_candidates" ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "positionId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "CandidateStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "election_positions" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "election_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polling_stations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polling_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_voters" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stationCode" TEXT,

    CONSTRAINT "election_voters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_ballots" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "clientRef" TEXT NOT NULL,
    "castHour" TIMESTAMP(3) NOT NULL,
    "stationId" TEXT,

    CONSTRAINT "election_ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "election_vote_choices" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "positionId" TEXT,

    CONSTRAINT "election_vote_choices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "election_positions_electionId_title_key" ON "election_positions"("electionId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "polling_stations_code_key" ON "polling_stations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "election_voters_electionId_memberId_key" ON "election_voters"("electionId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "election_ballots_clientRef_key" ON "election_ballots"("clientRef");

-- CreateIndex
CREATE INDEX "election_ballots_electionId_idx" ON "election_ballots"("electionId");

-- CreateIndex
CREATE INDEX "election_vote_choices_candidateId_idx" ON "election_vote_choices"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "election_vote_choices_ballotId_positionId_key" ON "election_vote_choices"("ballotId", "positionId");

-- CreateIndex
CREATE INDEX "election_candidates_electionId_status_idx" ON "election_candidates"("electionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "election_candidates_electionId_memberId_positionId_key" ON "election_candidates"("electionId", "memberId", "positionId");

-- AddForeignKey
ALTER TABLE "election_positions" ADD CONSTRAINT "election_positions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "election_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_candidates" ADD CONSTRAINT "election_candidates_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polling_stations" ADD CONSTRAINT "polling_stations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voters" ADD CONSTRAINT "election_voters_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_voters" ADD CONSTRAINT "election_voters_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballots" ADD CONSTRAINT "election_ballots_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_ballots" ADD CONSTRAINT "election_ballots_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "polling_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_vote_choices" ADD CONSTRAINT "election_vote_choices_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "election_ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "election_vote_choices" ADD CONSTRAINT "election_vote_choices_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "election_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
