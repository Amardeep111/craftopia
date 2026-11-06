-- Add emailVerified column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
-- Existing active users are marked as verified so their access is not disrupted
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" IS NULL;
