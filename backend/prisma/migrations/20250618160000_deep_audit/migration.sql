-- Extended Deep Scan technical audit payload
ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "deepAudit" JSONB;
