-- Visibility layer: brands, prompts, engine runs, scheduling

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';

ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "brandId" TEXT;

CREATE TABLE IF NOT EXISTS "Brand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "domain" TEXT,
    "category" TEXT,
    "description" TEXT,
    "enabledEngines" JSONB NOT NULL DEFAULT '["perplexity"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Competitor" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "domain" TEXT,
    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Prompt" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VisibilityRun" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error" TEXT,
    "visibilityScore" DOUBLE PRECISION,
    "citationRate" DOUBLE PRECISION,
    "shareOfVoice" DOUBLE PRECISION,
    "sentimentMix" JSONB,
    "engineScores" JSONB,
    "citedDomains" JSONB,
    "gapRecommendations" JSONB,
    "enginesUsed" JSONB,
    "promptCount" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    CONSTRAINT "VisibilityRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromptEngineResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "mentioned" BOOLEAN NOT NULL DEFAULT false,
    "cited" BOOLEAN NOT NULL DEFAULT false,
    "prominence" INTEGER,
    "sentiment" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "answerText" TEXT NOT NULL DEFAULT '',
    "competitorMentions" JSONB,
    "hallucinationFlags" JSONB,
    "raw" JSONB,
    CONSTRAINT "PromptEngineResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VisibilitySchedule" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold" DOUBLE PRECISION,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisibilitySchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Brand_userId_idx" ON "Brand"("userId");
CREATE INDEX IF NOT EXISTS "Competitor_brandId_idx" ON "Competitor"("brandId");
CREATE INDEX IF NOT EXISTS "Prompt_brandId_idx" ON "Prompt"("brandId");
CREATE INDEX IF NOT EXISTS "VisibilityRun_brandId_startedAt_idx" ON "VisibilityRun"("brandId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "PromptEngineResult_runId_idx" ON "PromptEngineResult"("runId");
CREATE UNIQUE INDEX IF NOT EXISTS "PromptEngineResult_runId_promptId_engine_key" ON "PromptEngineResult"("runId", "promptId", "engine");
CREATE INDEX IF NOT EXISTS "VisibilitySchedule_brandId_idx" ON "VisibilitySchedule"("brandId");
CREATE INDEX IF NOT EXISTS "VisibilitySchedule_enabled_nextRunAt_idx" ON "VisibilitySchedule"("enabled", "nextRunAt");
CREATE INDEX IF NOT EXISTS "WebsiteScan_brandId_idx" ON "WebsiteScan"("brandId");

ALTER TABLE "WebsiteScan" DROP CONSTRAINT IF EXISTS "WebsiteScan_brandId_fkey";
ALTER TABLE "WebsiteScan" ADD CONSTRAINT "WebsiteScan_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Brand" DROP CONSTRAINT IF EXISTS "Brand_userId_fkey";
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Competitor" DROP CONSTRAINT IF EXISTS "Competitor_brandId_fkey";
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prompt" DROP CONSTRAINT IF EXISTS "Prompt_brandId_fkey";
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilityRun" DROP CONSTRAINT IF EXISTS "VisibilityRun_brandId_fkey";
ALTER TABLE "VisibilityRun" ADD CONSTRAINT "VisibilityRun_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptEngineResult" DROP CONSTRAINT IF EXISTS "PromptEngineResult_runId_fkey";
ALTER TABLE "PromptEngineResult" ADD CONSTRAINT "PromptEngineResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "VisibilityRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptEngineResult" DROP CONSTRAINT IF EXISTS "PromptEngineResult_promptId_fkey";
ALTER TABLE "PromptEngineResult" ADD CONSTRAINT "PromptEngineResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilitySchedule" DROP CONSTRAINT IF EXISTS "VisibilitySchedule_brandId_fkey";
ALTER TABLE "VisibilitySchedule" ADD CONSTRAINT "VisibilitySchedule_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
