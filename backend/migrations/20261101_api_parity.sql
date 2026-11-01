-- Apply once to an existing production database before deploying the new API routes.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "adminPermissions" JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Older backend schema versions used TEXT[]. Supabase currently stores this as
-- JSONB, so normalize older installations without rewriting existing JSONB.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'User'
          AND column_name = 'adminPermissions'
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE "User" ALTER COLUMN "adminPermissions" DROP DEFAULT;
        ALTER TABLE "User" ALTER COLUMN "adminPermissions" TYPE JSONB
            USING to_jsonb("adminPermissions");
        ALTER TABLE "User" ALTER COLUMN "adminPermissions" SET DEFAULT '[]'::JSONB;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RefundRequest" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    amount INT NOT NULL,
    "refundUpiId" TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_refund_order_status"
    ON "RefundRequest"("orderId", status);
