-- Add soft delete columns to Product and Category tables
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "softDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "softDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Create partial indexes for fast filtering
CREATE INDEX IF NOT EXISTS "idx_category_soft_deleted" ON "Category" ("softDeleted") WHERE "softDeleted" = false;
CREATE INDEX IF NOT EXISTS "idx_product_soft_deleted" ON "Product" ("softDeleted") WHERE "softDeleted" = false;
