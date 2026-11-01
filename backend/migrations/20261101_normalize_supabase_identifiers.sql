-- The Supabase schema provided for this project uses unquoted PascalCase table
-- names and unquoted camelCase columns. PostgreSQL folds those to lowercase,
-- while the Go repositories use quoted Prisma-style identifiers. Rename only
-- when the lowercase source exists and the expected quoted target does not.
DO $$
DECLARE
    item RECORD;
BEGIN
    FOR item IN
        SELECT * FROM (VALUES
            ('category', 'Category'), ('product', 'Product'),
            ('order', 'Order'), ('orderitem', 'OrderItem'),
            ('customrequest', 'CustomRequest'), ('contactmessage', 'ContactMessage'),
            ('user', 'User'), ('address', 'Address'), ('session', 'Session'),
            ('emailverification', 'EmailVerification'), ('coupon', 'Coupon'),
            ('paymentlog', 'PaymentLog'), ('authratelimit', 'AuthRateLimit'),
            ('storesetting', 'StoreSetting'), ('cart', 'Cart'),
            ('cartitem', 'CartItem'), ('review', 'Review'),
            ('refundrequest', 'RefundRequest'), ('couponusage', 'CouponUsage')
        ) AS names(source_name, target_name)
    LOOP
        IF to_regclass(format('public.%I', item.source_name)) IS NOT NULL
           AND to_regclass(format('public.%I', item.target_name)) IS NULL THEN
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', item.source_name, item.target_name);
        END IF;
    END LOOP;

    FOR item IN
        SELECT * FROM (VALUES
            ('Category', 'createdat', 'createdAt'), ('Category', 'updatedat', 'updatedAt'),
            ('Product', 'categoryid', 'categoryId'), ('Product', 'discountpercent', 'discountPercent'),
            ('Product', 'gstpercent', 'gstPercent'), ('Product', 'codfee', 'codFee'),
            ('Product', 'othercharge', 'otherCharge'), ('Product', 'imageurl', 'imageUrl'),
            ('Product', 'cloudinarypublicid', 'cloudinaryPublicId'),
            ('Product', 'unavailablestates', 'unavailableStates'),
            ('Product', 'unavailablepincodes', 'unavailablePinCodes'),
            ('Product', 'allowedpaymentmethods', 'allowedPaymentMethods'),
            ('Product', 'availableforsale', 'availableForSale'),
            ('Product', 'createdat', 'createdAt'), ('Product', 'updatedat', 'updatedAt'),
            ('Order', 'ordernumber', 'orderNumber'), ('Order', 'userid', 'userId'),
            ('Order', 'customername', 'customerName'), ('Order', 'customeremail', 'customerEmail'),
            ('Order', 'customerphone', 'customerPhone'), ('Order', 'shippingaddress', 'shippingAddress'),
            ('Order', 'paymentmethod', 'paymentMethod'), ('Order', 'paymentstatus', 'paymentStatus'),
            ('Order', 'paymentreference', 'paymentReference'), ('Order', 'idempotencykey', 'idempotencyKey'),
            ('Order', 'totalamount', 'totalAmount'), ('Order', 'createdat', 'createdAt'),
            ('Order', 'updatedat', 'updatedAt'), ('Order', 'trackingnumber', 'trackingNumber'),
            ('Order', 'shippingpartner', 'shippingPartner'), ('Order', 'estimateddelivery', 'estimatedDelivery'),
            ('OrderItem', 'orderid', 'orderId'), ('OrderItem', 'productid', 'productId'),
            ('OrderItem', 'unitprice', 'unitPrice'), ('OrderItem', 'createdat', 'createdAt'),
            ('OrderItem', 'gstpercent', 'gstPercent'), ('OrderItem', 'gstamount', 'gstAmount'),
            ('OrderItem', 'codfee', 'codFee'), ('OrderItem', 'othercharge', 'otherCharge'),
            ('CustomRequest', 'referenceimages', 'referenceImages'),
            ('CustomRequest', 'userid', 'userId'), ('CustomRequest', 'quotedprice', 'quotedPrice'),
            ('CustomRequest', 'adminnotes', 'adminNotes'), ('CustomRequest', 'createdat', 'createdAt'),
            ('CustomRequest', 'updatedat', 'updatedAt'), ('ContactMessage', 'createdat', 'createdAt'),
            ('User', 'adminpermissions', 'adminPermissions'), ('User', 'adminactive', 'adminActive'),
            ('User', 'createdat', 'createdAt'), ('User', 'updatedat', 'updatedAt'),
            ('Address', 'userid', 'userId'), ('Address', 'fullname', 'fullName'),
            ('Address', 'mobilenumber', 'mobileNumber'), ('Address', 'houseflatbuilding', 'houseFlatBuilding'),
            ('Address', 'areastreet', 'areaStreet'), ('Address', 'pincode', 'pinCode'),
            ('Address', 'addresstype', 'addressType'), ('Address', 'isdefault', 'isDefault'),
            ('Address', 'createdat', 'createdAt'), ('Address', 'updatedat', 'updatedAt'),
            ('Session', 'userid', 'userId'), ('Session', 'expiresat', 'expiresAt'),
            ('Session', 'createdat', 'createdAt'), ('Session', 'revokedat', 'revokedAt'),
            ('EmailVerification', 'codehash', 'codeHash'), ('EmailVerification', 'expiresat', 'expiresAt'),
            ('EmailVerification', 'consumedat', 'consumedAt'), ('EmailVerification', 'createdat', 'createdAt'),
            ('EmailVerification', 'updatedat', 'updatedAt'), ('Coupon', 'discountpercent', 'discountPercent'),
            ('Coupon', 'minsubtotal', 'minSubtotal'), ('Coupon', 'expiresat', 'expiresAt'),
            ('Coupon', 'createdat', 'createdAt'), ('Coupon', 'updatedat', 'updatedAt'),
            ('Coupon', 'currentuses', 'currentUses'), ('Coupon', 'firsttimeonly', 'firstTimeOnly'),
            ('Coupon', 'maxuses', 'maxUses'), ('PaymentLog', 'orderid', 'orderId'),
            ('PaymentLog', 'providerreference', 'providerReference'), ('PaymentLog', 'verifiedby', 'verifiedBy'),
            ('PaymentLog', 'verifiedat', 'verifiedAt'), ('PaymentLog', 'createdat', 'createdAt'),
            ('AuthRateLimit', 'windowstartedat', 'windowStartedAt'), ('AuthRateLimit', 'blockeduntil', 'blockedUntil'),
            ('AuthRateLimit', 'updatedat', 'updatedAt'), ('StoreSetting', 'merchantvpa', 'merchantVpa'),
            ('StoreSetting', 'merchantname', 'merchantName'), ('StoreSetting', 'whatsappnumber', 'whatsappNumber'),
            ('StoreSetting', 'updatedat', 'updatedAt'), ('StoreSetting', 'aboutcontent', 'aboutContent'),
            ('StoreSetting', 'sitecontent', 'siteContent'), ('Cart', 'userid', 'userId'),
            ('Cart', 'createdat', 'createdAt'), ('Cart', 'updatedat', 'updatedAt'),
            ('CartItem', 'cartid', 'cartId'), ('CartItem', 'productid', 'productId'),
            ('CartItem', 'createdat', 'createdAt'), ('CartItem', 'updatedat', 'updatedAt'),
            ('Review', 'productid', 'productId'), ('Review', 'userid', 'userId'),
            ('Review', 'orderid', 'orderId'), ('Review', 'productrating', 'productRating'),
            ('Review', 'deliveryrating', 'deliveryRating'), ('Review', 'packagingrating', 'packagingRating'),
            ('Review', 'createdat', 'createdAt'), ('RefundRequest', 'orderid', 'orderId'),
            ('RefundRequest', 'refundupiid', 'refundUpiId'), ('RefundRequest', 'adminnote', 'adminNote'),
            ('RefundRequest', 'reviewedby', 'reviewedBy'), ('RefundRequest', 'reviewedat', 'reviewedAt'),
            ('RefundRequest', 'createdat', 'createdAt'), ('RefundRequest', 'updatedat', 'updatedAt'),
            ('CouponUsage', 'couponid', 'couponId'), ('CouponUsage', 'userid', 'userId'),
            ('CouponUsage', 'usedat', 'usedAt')
        ) AS names(table_name, source_name, target_name)
    LOOP
        IF to_regclass(format('public.%I', item.table_name)) IS NOT NULL
           AND EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = item.table_name
                 AND column_name = item.source_name
           )
           AND NOT EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = item.table_name
                 AND column_name = item.target_name
           ) THEN
            EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', item.table_name, item.source_name, item.target_name);
        END IF;
    END LOOP;
END $$;
