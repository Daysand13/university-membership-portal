-- Rate limiting: tracks recent attempts at sensitive/abusable actions
-- (logins, password reset requests, public form submissions) so they can
-- be throttled. Backed by the database rather than an external service.

CREATE TABLE "rate_limit_attempts" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX "rate_limit_attempts_key_createdAt_idx" ON "rate_limit_attempts"("key", "createdAt");
