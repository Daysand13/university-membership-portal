-- Alumni Network: a separate account system (email + password login,
-- distinct from the student portal's index-number login) with an optional
-- link back to a graduated student Member record.

ALTER TABLE "members" ADD COLUMN "graduatedAt" TIMESTAMP(3);

CREATE TYPE "AlumniStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "alumni_profiles" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT NOT NULL,
  "passwordHash" TEXT,
  "mustSetPassword" BOOLEAN NOT NULL DEFAULT false,
  "graduationYear" INTEGER NOT NULL,
  "programme" TEXT NOT NULL,
  "profession" TEXT,
  "currentLocation" TEXT,
  "profileImageUrl" TEXT,
  "bio" TEXT,
  "willingToMentor" BOOLEAN NOT NULL DEFAULT false,
  "directoryVisible" BOOLEAN NOT NULL DEFAULT true,
  "status" "AlumniStatus" NOT NULL DEFAULT 'ACTIVE',
  "sourceMemberId" TEXT UNIQUE REFERENCES "members"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "alumni_profiles_status_idx" ON "alumni_profiles"("status");
CREATE INDEX "alumni_profiles_willingToMentor_idx" ON "alumni_profiles"("willingToMentor");
CREATE INDEX "alumni_profiles_directoryVisible_idx" ON "alumni_profiles"("directoryVisible");

CREATE TABLE "alumni_password_reset_tokens" (
  "id" TEXT PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "alumniId" TEXT NOT NULL REFERENCES "alumni_profiles"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX "alumni_password_reset_tokens_alumniId_idx" ON "alumni_password_reset_tokens"("alumniId");
