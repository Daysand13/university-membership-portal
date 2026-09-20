-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "permissionMask" JSONB;

-- CreateTable
CREATE TABLE "image_descriptions" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "image_descriptions_url_key" ON "image_descriptions"("url");

-- AddForeignKey
ALTER TABLE "image_descriptions" ADD CONSTRAINT "image_descriptions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
