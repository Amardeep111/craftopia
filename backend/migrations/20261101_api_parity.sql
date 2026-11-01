-- Apply once to an existing production database before deploying the new API routes.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

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
