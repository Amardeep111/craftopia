-- ==============================================================================
-- PostgreSQL Schema for Jamae's Craftopia Backend (Go Service)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM (
        'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED',
        'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_IN_TRANSIT',
        'RETURNED', 'REFUND_REQUESTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM (
        'PENDING', 'AWAITING_VERIFICATION', 'PAID', 'COD_PENDING_COLLECTION',
        'COD_COLLECTED', 'FAILED', 'CANCELLED', 'MANUAL_REVIEW', 'REFUNDED', 'REFUND_REQUESTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM (
        'NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    accent TEXT,
    image TEXT,
    published BOOLEAN DEFAULT true,
    hidden BOOLEAN DEFAULT false,
    "order" INT DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS "Product" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    "categoryId" TEXT NOT NULL REFERENCES "Category"(id) ON DELETE CASCADE,
    price INT NOT NULL,
    "discountPercent" INT DEFAULT 0,
    "gstPercent" INT DEFAULT 0,
    "codFee" INT DEFAULT 0,
    "otherCharge" INT DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    short TEXT NOT NULL,
    description TEXT NOT NULL,
    materials TEXT,
    care TEXT,
    customization TEXT,
    visual TEXT,
    palette JSONB,
    images JSONB,
    "imageUrl" TEXT,
    "cloudinaryPublicId" TEXT,
    stock INT NOT NULL DEFAULT 0,
    published BOOLEAN DEFAULT true,
    "availableForSale" BOOLEAN DEFAULT true,
    "unavailableStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unavailablePinCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedPaymentMethods" TEXT[] DEFAULT ARRAY['upi']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'CUSTOMER',
    "emailVerified" BOOLEAN DEFAULT false,
    "adminActive" BOOLEAN DEFAULT false,
    "adminPermissions" JSONB NOT NULL DEFAULT '[]'::JSONB,
    active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminPermissions" JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Shopping cart (required by the authenticated cart endpoints)
CREATE TABLE IF NOT EXISTS "Cart" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CartItem" (
    id TEXT PRIMARY KEY,
    "cartId" TEXT NOT NULL REFERENCES "Cart"(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS "Order" (
    id TEXT PRIMARY KEY,
    "orderNumber" TEXT UNIQUE NOT NULL,
    "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" JSONB,
    status "OrderStatus" DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "idempotencyKey" TEXT,
    "totalAmount" INT NOT NULL,
    subtotal INT NOT NULL,
    discount INT DEFAULT 0,
    shipping INT DEFAULT 0,
    fee INT DEFAULT 0,
    notes TEXT,
    "trackingNumber" TEXT,
    "shippingPartner" TEXT,
    "estimatedDelivery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order Items
CREATE TABLE IF NOT EXISTS "OrderItem" (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
    "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    "unitPrice" INT NOT NULL,
    "gstPercent" INT DEFAULT 0,
    "gstAmount" INT DEFAULT 0,
    "codFee" INT DEFAULT 0,
    "otherCharge" INT DEFAULT 0,
    customization TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_order_product" UNIQUE ("orderId", "productId")
);

-- Payment Logs
CREATE TABLE IF NOT EXISTS "PaymentLog" (
    id TEXT PRIMARY KEY,
    "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    status "PaymentStatus" NOT NULL,
    provider TEXT,
    "providerReference" TEXT,
    method TEXT,
    utr TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Custom Requests
CREATE TABLE IF NOT EXISTS "CustomRequest" (
    id TEXT PRIMARY KEY,
    "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    idea TEXT NOT NULL,
    category TEXT,
    colors TEXT,
    budget TEXT,
    occasion TEXT,
    details TEXT NOT NULL,
    "referenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quotedPrice" INT,
    status "RequestStatus" DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (for stateful AES-256-GCM authenticated cookie auth)
CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "Session"(token);
CREATE INDEX IF NOT EXISTS "idx_session_user_revoked" ON "Session"("userId", "revokedAt");

-- Store Settings
CREATE TABLE IF NOT EXISTS "StoreSetting" (
    id TEXT PRIMARY KEY DEFAULT 'main',
    "merchantVpa" TEXT,
    "merchantName" TEXT DEFAULT 'Jamae''s Craftopia',
    "whatsappNumber" TEXT,
    "aboutContent" JSONB,
    "siteContent" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Coupons
CREATE TABLE IF NOT EXISTS "Coupon" (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    "discountPercent" INT NOT NULL,
    "minSubtotal" INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "firstTimeOnly" BOOLEAN DEFAULT false,
    "maxUses" INT DEFAULT 0,
    "currentUses" INT DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CouponUsage" (
    id TEXT PRIMARY KEY,
    "couponId" TEXT NOT NULL REFERENCES "Coupon"(id) ON DELETE CASCADE,
    "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    used BOOLEAN NOT NULL DEFAULT true,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS "Address" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "houseFlatBuilding" TEXT NOT NULL,
    "areaStreet" TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "addressType" TEXT NOT NULL DEFAULT 'home',
    "isDefault" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS "Review" (
    id TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "orderId" TEXT NOT NULL REFERENCES "Order"(id),
    "productRating" INT NOT NULL,
    "deliveryRating" INT NOT NULL,
    "packagingRating" INT NOT NULL,
    title TEXT,
    comment TEXT NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ContactMessage" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    replied BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
    key TEXT PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Refund Requests
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
CREATE INDEX IF NOT EXISTS "idx_refund_order_status" ON "RefundRequest"("orderId", status);

-- Email Verification for Signup and Password Change OTPs
CREATE TABLE IF NOT EXISTS "EmailVerification" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    email TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    payload JSONB NOT NULL,
    attempts INT DEFAULT 0,
    resends INT DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_email_verification" ON "EmailVerification"(email, "expiresAt");

-- Query support for the storefront and common account/order lookups.
CREATE INDEX IF NOT EXISTS "idx_product_category" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_product_published_created" ON "Product"("createdAt" DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS "idx_product_category_published_created" ON "Product"("categoryId", "createdAt" DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS "idx_product_featured_published_created" ON "Product"("createdAt" DESC) WHERE published = true AND featured = true;
CREATE INDEX IF NOT EXISTS "idx_category_storefront_order" ON "Category"("order", name) WHERE published = true AND hidden = false;
CREATE INDEX IF NOT EXISTS "idx_order_email_created" ON "Order"("customerEmail", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_order_created" ON "Order"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_order_status" ON "Order"(status, "paymentStatus");
CREATE INDEX IF NOT EXISTS "idx_address_user_default_updated" ON "Address"("userId", "isDefault" DESC, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_cart_user_created" ON "Cart"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_cart_item_cart_created" ON "CartItem"("cartId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_order_item_order_created" ON "OrderItem"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_payment_log_order_created" ON "PaymentLog"("orderId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_review_product_created" ON "Review"("productId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_custom_request_created" ON "CustomRequest"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_coupon_usage_coupon_user" ON "CouponUsage"("couponId", "userId");
CREATE INDEX IF NOT EXISTS "idx_coupon_created" ON "Coupon"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_coupon_active_discount" ON "Coupon"("discountPercent" DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS "idx_customer_created" ON "User"("createdAt" DESC) WHERE role = 'CUSTOMER';
