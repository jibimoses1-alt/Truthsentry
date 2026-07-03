-- Align default claim language with Arabic-first product (existing rows unchanged).
ALTER TABLE "Claim" ALTER COLUMN "claimLanguage" SET DEFAULT 'ar';
