-- Add couponCode column to Order table to persist applied coupon promo codes
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
