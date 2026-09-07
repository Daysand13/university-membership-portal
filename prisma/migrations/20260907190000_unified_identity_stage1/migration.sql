-- CreateEnum
CREATE TYPE "UserRoleName" AS ENUM ('MEMBER', 'ALUMNI', 'ADMIN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "alumni_profiles" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRoleName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "indexNumber" TEXT NOT NULL,
    "applicationTrack" "ApplicationTrack",
    "degreeCategory" TEXT,
    "programme" TEXT NOT NULL,
    "academicDepartment" TEXT,
    "level" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "hallOfAffiliation" TEXT,
    "yearOfAdmission" INTEGER NOT NULL,
    "expectedGraduationYear" INTEGER,
    "department" TEXT NOT NULL,
    "specificSupportNeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "membershipType" "MembershipType",
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "graduatedAt" TIMESTAMP(3),
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "user_roles"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_indexNumber_key" ON "student_enrollments"("indexNumber");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_applicationId_key" ON "student_enrollments"("applicationId");

-- CreateIndex
CREATE INDEX "student_enrollments_userId_idx" ON "student_enrollments"("userId");

-- CreateIndex
CREATE INDEX "student_enrollments_status_idx" ON "student_enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_userId_key" ON "admin_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_profiles_userId_key" ON "alumni_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "membership_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

