-- BYOK API key vault + Deep Scan fields on WebsiteScan

CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT false,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_userId_provider_key" ON "ApiKey"("userId", "provider");
CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey"("userId");

ALTER TABLE "ApiKey" DROP CONSTRAINT IF EXISTS "ApiKey_userId_fkey";
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "scanMode" TEXT NOT NULL DEFAULT 'flash';
ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "deepStatus" TEXT;
ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "deepVisibility" JSONB;
ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "deepError" TEXT;
