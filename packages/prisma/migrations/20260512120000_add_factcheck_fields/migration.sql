-- Add fact-checking enums
DO $$ BEGIN
    CREATE TYPE "FactCheckStatus" AS ENUM ('PENDING', 'VERIFIED', 'DEBUNKED', 'MISLEADING', 'PARTIALLY_TRUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SourceType" AS ENUM ('POLITICIAN', 'MEDIA', 'SOCIAL_MEDIA', 'BLOG', 'NGO', 'CITIZEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "MediaType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'TEXT_IMAGE', 'TEXT_VIDEO', 'TEXT_AUDIO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "TopicCategory" AS ENUM ('POLITICS', 'HEALTH', 'FINANCE', 'TECH', 'SECURITY', 'EDUCATION', 'ENVIRONMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add fact-checking columns to Claim
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "claimText" TEXT;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "claimLanguage" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "claimDate" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "sourceName" TEXT;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "sourceType" "SourceType";
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "mediaType" "MediaType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "factCheckText" TEXT;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "factCheckStatus" "FactCheckStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "factCheckDate" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "topicCategory" "TopicCategory";
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "platform" TEXT;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "Claim_factCheckStatus_createdAt_idx"
ON "Claim"("factCheckStatus", "createdAt");

CREATE INDEX IF NOT EXISTS "Claim_topicCategory_createdAt_idx"
ON "Claim"("topicCategory", "createdAt");

CREATE INDEX IF NOT EXISTS "Claim_platform_createdAt_idx"
ON "Claim"("platform", "createdAt");
