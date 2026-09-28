-- CreateEnum
CREATE TYPE "AppAudience" AS ENUM ('MEMBER', 'ALUMNI', 'PATRON');

-- CreateTable
CREATE TABLE "mobile_devices" (
    "id" TEXT NOT NULL,
    "audience" "AppAudience" NOT NULL,
    "memberId" TEXT,
    "alumniProfileId" TEXT,
    "patronId" TEXT,
    "refreshTokenHash" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "deviceName" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "appVersion" TEXT,
    "androidSdk" INTEGER,
    "pushToken" TEXT,
    "notifyNews" BOOLEAN NOT NULL DEFAULT true,
    "notifyEvents" BOOLEAN NOT NULL DEFAULT true,
    "notifyAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" INTEGER NOT NULL,
    "apkUrl" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "changelog" TEXT NOT NULL,
    "minimumBuild" INTEGER NOT NULL DEFAULT 0,
    "minAndroidSdk" INTEGER NOT NULL DEFAULT 26,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_devices_refreshTokenHash_key" ON "mobile_devices"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "mobile_devices_memberId_revokedAt_idx" ON "mobile_devices"("memberId", "revokedAt");

-- CreateIndex
CREATE INDEX "mobile_devices_alumniProfileId_revokedAt_idx" ON "mobile_devices"("alumniProfileId", "revokedAt");

-- CreateIndex
CREATE INDEX "mobile_devices_patronId_revokedAt_idx" ON "mobile_devices"("patronId", "revokedAt");

-- CreateIndex
CREATE INDEX "mobile_devices_pushToken_idx" ON "mobile_devices"("pushToken");

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_version_key" ON "app_releases"("version");

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_buildNumber_key" ON "app_releases"("buildNumber");

-- CreateIndex
CREATE INDEX "app_releases_published_buildNumber_idx" ON "app_releases"("published", "buildNumber");

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_alumniProfileId_fkey" FOREIGN KEY ("alumniProfileId") REFERENCES "alumni_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_patronId_fkey" FOREIGN KEY ("patronId") REFERENCES "patron_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_releases" ADD CONSTRAINT "app_releases_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
