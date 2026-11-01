-- Indexes for paginated admin lists and their batched relationship lookups.
CREATE INDEX IF NOT EXISTS "idx_order_user_id"
    ON "Order"("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_order_status_created_id"
    ON "Order"(status, "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "idx_order_payment_status_created_id"
    ON "Order"("paymentStatus", "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "idx_product_admin_name_id"
    ON "Product"(name, id);
CREATE INDEX IF NOT EXISTS "idx_custom_request_status_created_id"
    ON "CustomRequest"(status, "createdAt" DESC, id DESC);
CREATE INDEX IF NOT EXISTS "idx_customer_created_id"
    ON "User"("createdAt" DESC, id DESC) WHERE role = 'CUSTOMER';
