-- CreateTable
CREATE TABLE "admin_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_password_reset_tokens_tokenHash_key" ON "admin_password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_password_reset_tokens_adminId_idx" ON "admin_password_reset_tokens"("adminId");

-- AddForeignKey
ALTER TABLE "admin_password_reset_tokens" ADD CONSTRAINT "admin_password_reset_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
