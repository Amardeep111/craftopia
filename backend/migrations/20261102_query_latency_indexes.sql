-- Query-supporting indexes for the storefront, account, cart, and order flows.
-- Apply after 20261101_normalize_supabase_identifiers.sql.
CREATE INDEX IF NOT EXISTS "idx_product_published_created"
    ON "Product"("createdAt" DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS "idx_product_category_published_created"
    ON "Product"("categoryId", "createdAt" DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS "idx_product_featured_published_created"
    ON "Product"("createdAt" DESC) WHERE published = true AND featured = true;
CREATE INDEX IF NOT EXISTS "idx_category_storefront_order"
    ON "Category"("order", name) WHERE published = true AND hidden = false;
CREATE INDEX IF NOT EXISTS "idx_order_email_created"
    ON "Order"("customerEmail", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_order_created"
    ON "Order"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_address_user_default_updated"
    ON "Address"("userId", "isDefault" DESC, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_cart_user_created"
    ON "Cart"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_cart_item_cart_created"
    ON "CartItem"("cartId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_order_item_order_created"
    ON "OrderItem"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_payment_log_order_created"
    ON "PaymentLog"("orderId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_review_product_created"
    ON "Review"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_custom_request_created"
    ON "CustomRequest"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_coupon_created"
    ON "Coupon"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_coupon_active_discount"
    ON "Coupon"("discountPercent" DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS "idx_customer_created"
    ON "User"("createdAt" DESC) WHERE role = 'CUSTOMER';

-- The composite email index replaces the old email-only lookup index.
DROP INDEX IF EXISTS "idx_order_email";
