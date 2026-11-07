package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type OrderRepository struct {
	db *database.DB
}

var (
	ErrOrderNotFound               = errors.New("order not found")
	ErrUnpaidUPIOrderCannotConfirm = errors.New("cannot confirm a UPI order before payment is verified and marked Paid")
)

func NewOrderRepository(db *database.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func generateID(prefix string) string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(b))
}

func generateOrderNumber() string {
	now := time.Now()
	ymd := now.Format("20060102")
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("ORD-JM-%s-%s", ymd, strings.ToUpper(hex.EncodeToString(b)))
}

func (r *OrderRepository) CreateOrder(ctx context.Context, userID *string, req *models.CreateOrderRequest) (*models.Order, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("cannot create order with empty items")
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var subtotal int
	var totalGST int
	var totalCODFee int
	var totalOther int

	type itemDetail struct {
		product     models.Product
		quantity    int
		unitPrice   int
		gstAmount   int
		codFee      int
		otherCharge int
	}

	isCOD := strings.EqualFold(req.PaymentMethod, "Cash on Delivery") || strings.EqualFold(req.PaymentMethod, "cod")
	paymentMethod := "UPI"
	initialPaymentStatus := models.PaymentStatusAwaitingVerification
	initialOrderStatus := models.OrderStatusPending

	if isCOD {
		paymentMethod = "Cash on Delivery"
		initialPaymentStatus = models.PaymentStatusCODPendingCollection
		initialOrderStatus = models.OrderStatusConfirmed
	}

	var itemsToInsert []itemDetail

	for _, it := range req.Items {
		var p models.Product
		err := tx.QueryRow(ctx, `
			SELECT id, name, price, COALESCE("discountPercent", 0), COALESCE("gstPercent", 0), COALESCE("codFee", 0), COALESCE("otherCharge", 0), stock
			FROM "Product" WHERE id = $1 FOR UPDATE;
		`, it.ProductID).Scan(
			&p.ID, &p.Name, &p.Price, &p.DiscountPercent, &p.GSTPercent, &p.CODFee, &p.OtherCharge, &p.Stock,
		)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("product %s not found", it.ProductID)
			}
			return nil, fmt.Errorf("failed to query product for update: %w", err)
		}

		if p.Stock < it.Quantity {
			return nil, fmt.Errorf("insufficient stock for %s (available: %d, requested: %d)", p.Name, p.Stock, it.Quantity)
		}

		// Decrement stock
		_, err = tx.Exec(ctx, `UPDATE "Product" SET stock = stock - $1 WHERE id = $2;`, it.Quantity, p.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to decrement product stock: %w", err)
		}

		unitPrice := int(math.Round(float64(p.Price*(100-p.DiscountPercent)) / 100.0))
		gstAmount := int(math.Round(float64(unitPrice*p.GSTPercent) / 100.0))
		codFee := 0
		if isCOD {
			codFee = p.CODFee
		}
		otherCharge := p.OtherCharge

		subtotal += unitPrice * it.Quantity
		totalGST += gstAmount * it.Quantity
		totalCODFee += codFee * it.Quantity
		totalOther += otherCharge * it.Quantity

		itemsToInsert = append(itemsToInsert, itemDetail{
			product:     p,
			quantity:    it.Quantity,
			unitPrice:   unitPrice,
			gstAmount:   gstAmount,
			codFee:      codFee,
			otherCharge: otherCharge,
		})
	}

	shipping := 49
	if subtotal >= 999 {
		shipping = 0
	}
	discount := 0
	now := time.Now()

	// Apply coupon if provided
	if req.CouponCode != nil && strings.TrimSpace(*req.CouponCode) != "" {
		cleanCoupon := strings.ToUpper(strings.TrimSpace(*req.CouponCode))
		var c Coupon
		cErr := tx.QueryRow(ctx, `
			SELECT id, code, label, "discountPercent", "minSubtotal", active, "expiresAt", "firstTimeOnly", "maxUses", "currentUses"
			FROM "Coupon" WHERE code = $1 FOR UPDATE;
		`, cleanCoupon).Scan(
			&c.ID, &c.Code, &c.Label, &c.DiscountPercent, &c.MinSubtotal, &c.Active,
			&c.ExpiresAt, &c.FirstTimeOnly, &c.MaxUses, &c.CurrentUses,
		)
		if cErr == nil && c.Active && (c.ExpiresAt == nil || c.ExpiresAt.After(now)) && subtotal >= c.MinSubtotal {
			canUse := true
			if c.MaxUses > 0 && c.CurrentUses >= c.MaxUses {
				canUse = false
			}
			if canUse && c.FirstTimeOnly && userID != nil {
				var used bool
				uErr := tx.QueryRow(ctx, `
					SELECT true FROM "CouponUsage" WHERE "couponId" = $1 AND "userId" = $2 LIMIT 1;
				`, c.ID, *userID).Scan(&used)
				if uErr == nil && used {
					canUse = false
				}
			}
			if canUse {
				discount = int(math.Round(float64(subtotal*c.DiscountPercent) / 100.0))
				_, _ = tx.Exec(ctx, `UPDATE "Coupon" SET "currentUses" = "currentUses" + 1, "updatedAt" = $1 WHERE id = $2;`, now, c.ID)
				if userID != nil {
					usageID := generateID("cusg")
					_, _ = tx.Exec(ctx, `INSERT INTO "CouponUsage" (id, "couponId", "userId", used, "usedAt") VALUES ($1, $2, $3, true, $4);`, usageID, c.ID, *userID, now)
				}
			}
		}
	}

	fee := totalGST + totalCODFee + totalOther
	totalAmount := subtotal - discount + shipping + fee
	if totalAmount < 0 {
		totalAmount = 0
	}

	orderID := generateID("ord")
	orderNumber := generateOrderNumber()

	// Insert Order
	insertOrderQuery := `
		INSERT INTO "Order" (
			id, "orderNumber", "userId", "customerName", "customerEmail", "customerPhone",
			"shippingAddress", status, "paymentMethod", "paymentStatus", "paymentReference",
			"totalAmount", subtotal, discount, shipping, fee, notes, "createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		) RETURNING id;
	`
	_, err = tx.Exec(ctx, insertOrderQuery,
		orderID, orderNumber, userID, req.CustomerName, req.CustomerEmail, req.CustomerPhone,
		req.ShippingAddress, initialOrderStatus, paymentMethod, initialPaymentStatus, req.PaymentReference,
		totalAmount, subtotal, discount, shipping, fee, req.Notes, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert order: %w", err)
	}

	// Insert Order Items
	for _, item := range itemsToInsert {
		itemID := generateID("item")
		_, err = tx.Exec(ctx, `
			INSERT INTO "OrderItem" (
				id, "orderId", "productId", quantity, "unitPrice", "gstPercent", "gstAmount",
				"codFee", "otherCharge", "createdAt"
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
		`, itemID, orderID, item.product.ID, item.quantity, item.unitPrice, item.product.GSTPercent, item.gstAmount,
			item.codFee, item.otherCharge, now)
		if err != nil {
			return nil, fmt.Errorf("failed to insert order item: %w", err)
		}
	}

	// Insert initial Payment Log
	logID := generateID("plog")
	provider := "UPI"
	if isCOD {
		provider = "COD"
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO "PaymentLog" (
			id, "orderId", amount, status, provider, "providerReference", method, utr, "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
	`, logID, orderID, totalAmount, initialPaymentStatus, provider, req.PaymentReference, paymentMethod, req.PaymentReference, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert payment log: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit order transaction: %w", err)
	}

	return r.GetOrderByID(ctx, orderID)
}

func (r *OrderRepository) GetOrderByID(ctx context.Context, id string) (*models.Order, error) {
	query := `
		SELECT id, "orderNumber", "userId", "customerName", "customerEmail", "customerPhone",
		       "shippingAddress", status, "paymentMethod", "paymentStatus", "paymentReference",
		       "totalAmount", subtotal, discount, shipping, fee, notes, "trackingNumber",
		       "shippingPartner", "estimatedDelivery", "createdAt", "updatedAt"
		FROM "Order" WHERE id = $1;
	`
	var o models.Order
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&o.ID, &o.OrderNumber, &o.UserID, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
		&o.ShippingAddress, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.PaymentReference,
		&o.TotalAmount, &o.Subtotal, &o.Discount, &o.Shipping, &o.Fee, &o.Notes, &o.TrackingNumber,
		&o.ShippingPartner, &o.EstimatedDelivery, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	// Fetch items
	itemsRows, err := r.db.Pool.Query(ctx, `
		SELECT oi.id, oi."orderId", oi."productId", oi.quantity, oi."unitPrice", oi."gstPercent",
		       oi."gstAmount", oi."codFee", oi."otherCharge", oi.customization, oi."createdAt",
		       p.name, p.slug
		FROM "OrderItem" oi
		LEFT JOIN "Product" p ON oi."productId" = p.id
		WHERE oi."orderId" = $1;
	`, o.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to query order items: %w", err)
	}
	for itemsRows.Next() {
		var it models.OrderItem
		var p models.Product
		if scanErr := itemsRows.Scan(
			&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.UnitPrice, &it.GSTPercent,
			&it.GSTAmount, &it.CODFee, &it.OtherCharge, &it.Customization, &it.CreatedAt,
			&p.Name, &p.Slug,
		); scanErr != nil {
			itemsRows.Close()
			return nil, fmt.Errorf("failed to scan order item: %w", scanErr)
		}
		it.Product = &p
		o.Items = append(o.Items, it)
	}
	if err := itemsRows.Err(); err != nil {
		itemsRows.Close()
		return nil, fmt.Errorf("failed while reading order items: %w", err)
	}
	itemsRows.Close()

	// Fetch payment logs
	logsRows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderId", amount, status, provider, "providerReference", method, utr, "verifiedBy", "verifiedAt", "createdAt"
		FROM "PaymentLog" WHERE "orderId" = $1 ORDER BY "createdAt" DESC;
	`, o.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to query payment logs: %w", err)
	}
	defer logsRows.Close()
	for logsRows.Next() {
		var l models.PaymentLog
		if scanErr := logsRows.Scan(
			&l.ID, &l.OrderID, &l.Amount, &l.Status, &l.Provider, &l.ProviderReference,
			&l.Method, &l.UTR, &l.VerifiedBy, &l.VerifiedAt, &l.CreatedAt,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan payment log: %w", scanErr)
		}
		o.PaymentLogs = append(o.PaymentLogs, l)
	}
	if err := logsRows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading payment logs: %w", err)
	}

	return &o, nil
}

func (r *OrderRepository) GetRefundRequestsByOrderID(ctx context.Context, orderID string) ([]models.RefundRequest, error) {
	refundRows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderId", reason, amount, "refundUpiId", status, "adminNote", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"
		FROM "RefundRequest" WHERE "orderId" = $1 ORDER BY "createdAt" DESC;
	`, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to query refund requests: %w", err)
	}
	defer refundRows.Close()
	refunds := make([]models.RefundRequest, 0)
	for refundRows.Next() {
		var refund models.RefundRequest
		if err := refundRows.Scan(&refund.ID, &refund.OrderID, &refund.Reason, &refund.Amount, &refund.RefundUPIID, &refund.Status, &refund.AdminNote, &refund.ReviewedBy, &refund.ReviewedAt, &refund.CreatedAt, &refund.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan refund request: %w", err)
		}
		refunds = append(refunds, refund)
	}
	if err := refundRows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading refund requests: %w", err)
	}
	return refunds, nil
}

func (r *OrderRepository) GetOrdersByEmail(ctx context.Context, email string) ([]models.Order, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderNumber", "customerName", "customerEmail", status, "paymentMethod",
		       "paymentStatus", "paymentReference", "totalAmount", "createdAt"
		FROM "Order" WHERE "customerEmail" = $1 ORDER BY "createdAt" DESC;
	`, email)
	if err != nil {
		return nil, fmt.Errorf("failed to query orders: %w", err)
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		if scanErr := rows.Scan(
			&o.ID, &o.OrderNumber, &o.CustomerName, &o.CustomerEmail, &o.Status,
			&o.PaymentMethod, &o.PaymentStatus, &o.PaymentReference, &o.TotalAmount, &o.CreatedAt,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan customer order: %w", scanErr)
		}
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading customer orders: %w", err)
	}
	return orders, nil
}

// VerifyUPIPayment implements strict value checks:
// 1. Enter UTR before marking payment PAID on UPI order.
// 2. Cannot mark fulfillment CONFIRMED without payment verification.
// 3. Auto-advances fulfillment to CONFIRMED when paid.
// 4. Inserts audit payment log with admin email.
func (r *OrderRepository) VerifyUPIPayment(ctx context.Context, orderID string, utr string, adminEmail string) (*models.Order, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var paymentMethod, paymentStatus string
	var amount int
	var storedReference *string
	if err := tx.QueryRow(ctx, `SELECT "paymentMethod", "paymentStatus", "paymentReference", "totalAmount" FROM "Order" WHERE id = $1 FOR UPDATE`, orderID).Scan(&paymentMethod, &paymentStatus, &storedReference, &amount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("failed to load order for payment verification: %w", err)
	}
	if !strings.Contains(strings.ToLower(paymentMethod), "upi") {
		return nil, errors.New("UPI verification can only be used for UPI orders")
	}
	cleanUTR := strings.TrimSpace(utr)
	if cleanUTR == "" && storedReference != nil {
		cleanUTR = strings.TrimSpace(*storedReference)
	}
	if cleanUTR == "" {
		return nil, errors.New("enter the UPI transaction reference (UTR) before confirming payment")
	}
	if paymentStatus == string(models.PaymentStatusPaid) {
		return nil, errors.New("this UPI order is already marked Paid")
	}
	if paymentStatus != string(models.PaymentStatusAwaitingVerification) && paymentStatus != string(models.PaymentStatusManualReview) {
		return nil, fmt.Errorf("UPI payment cannot be verified while its status is %s", paymentStatus)
	}

	now := time.Now()
	_, err = tx.Exec(ctx, `
		UPDATE "Order"
		SET "paymentStatus" = 'PAID',
		    "paymentReference" = $1,
		    status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED'::"OrderStatus" ELSE status END,
		    "updatedAt" = $2
		WHERE id = $3;
	`, cleanUTR, now, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to update order payment: %w", err)
	}

	// Create payment verification audit log
	logID := generateID("plog")
	method := "ADMIN_PAYMENT_VERIFIED"
	provider := "UPI"
	_, err = tx.Exec(ctx, `
		INSERT INTO "PaymentLog" (
			id, "orderId", amount, status, provider, "providerReference", method, utr, "verifiedBy", "verifiedAt", "createdAt"
		) VALUES ($1, $2, $3, 'PAID', $4, $5, $6, $7, $8, $9, $10);
	`, logID, orderID, amount, provider, cleanUTR, method, cleanUTR, adminEmail, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert audit payment log: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetOrderByID(ctx, orderID)
}

// GetOrderByOrderNumber finds an order by its unique orderNumber string
func (r *OrderRepository) GetOrderByOrderNumber(ctx context.Context, orderNumber string) (*models.Order, error) {
	query := `
		SELECT id, "orderNumber", "userId", "customerName", "customerEmail", "customerPhone",
		       "shippingAddress", status, "paymentMethod", "paymentStatus", "paymentReference",
		       "totalAmount", subtotal, discount, shipping, fee, notes, "trackingNumber",
		       "shippingPartner", "estimatedDelivery", "createdAt", "updatedAt"
		FROM "Order" WHERE "orderNumber" = $1;
	`
	var o models.Order
	err := r.db.Pool.QueryRow(ctx, query, orderNumber).Scan(
		&o.ID, &o.OrderNumber, &o.UserID, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
		&o.ShippingAddress, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.PaymentReference,
		&o.TotalAmount, &o.Subtotal, &o.Discount, &o.Shipping, &o.Fee, &o.Notes, &o.TrackingNumber,
		&o.ShippingPartner, &o.EstimatedDelivery, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get order by orderNumber: %w", err)
	}

	// Fetch items
	itemsRows, err := r.db.Pool.Query(ctx, `
		SELECT oi.id, oi."orderId", oi."productId", oi.quantity, oi."unitPrice", oi."gstPercent",
		       oi."gstAmount", oi."codFee", oi."otherCharge", oi.customization, oi."createdAt",
		       p.name, p.slug
		FROM "OrderItem" oi
		LEFT JOIN "Product" p ON oi."productId" = p.id
		WHERE oi."orderId" = $1;
	`, o.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to query order items: %w", err)
	}
	defer itemsRows.Close()
	for itemsRows.Next() {
		var it models.OrderItem
		var p models.Product
		if scanErr := itemsRows.Scan(
			&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.UnitPrice, &it.GSTPercent,
			&it.GSTAmount, &it.CODFee, &it.OtherCharge, &it.Customization, &it.CreatedAt,
			&p.Name, &p.Slug,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan order item: %w", scanErr)
		}
		it.Product = &p
		o.Items = append(o.Items, it)
	}
	if err := itemsRows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading order items: %w", err)
	}
	return &o, nil
}

// GetAllOrdersAdmin returns a filtered page. Item and refund rows are batch-loaded
// only for orders on that page, avoiding both unbounded payloads and N+1 queries.
func (r *OrderRepository) GetAllOrdersAdmin(ctx context.Context, page, pageSize int, search, status, paymentStatus, customerEmail string) (*PageResult[models.Order], error) {
	pattern := "%" + search + "%"
	var total int64
	filterSQL := `
		WHERE ($1 = '' OR "orderNumber" ILIKE $2 OR "customerName" ILIKE $2 OR "customerEmail" ILIKE $2 OR COALESCE("customerPhone", '') ILIKE $2)
		  AND ($3 = '' OR status::text = $3)
		  AND ($4 = '' OR "paymentStatus"::text = $4)
		  AND ($5 = '' OR LOWER("customerEmail") = LOWER($5))
	`
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Order" `+filterSQL, search, pattern, status, paymentStatus, customerEmail).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count admin orders: %w", err)
	}
	offset := (page - 1) * pageSize
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderNumber", "userId", "customerName", "customerEmail", "customerPhone",
		       "shippingAddress", status, "paymentMethod", "paymentStatus", "paymentReference",
		       "totalAmount", subtotal, discount, shipping, fee, notes, "trackingNumber",
		       "shippingPartner", "estimatedDelivery", "createdAt", "updatedAt"
		FROM "Order" `+filterSQL+`
		ORDER BY "createdAt" DESC, id DESC
		LIMIT $6 OFFSET $7;
	`, search, pattern, status, paymentStatus, customerEmail, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query admin orders: %w", err)
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		if scanErr := rows.Scan(
			&o.ID, &o.OrderNumber, &o.UserID, &o.CustomerName, &o.CustomerEmail, &o.CustomerPhone,
			&o.ShippingAddress, &o.Status, &o.PaymentMethod, &o.PaymentStatus, &o.PaymentReference,
			&o.TotalAmount, &o.Subtotal, &o.Discount, &o.Shipping, &o.Fee, &o.Notes, &o.TrackingNumber,
			&o.ShippingPartner, &o.EstimatedDelivery, &o.CreatedAt, &o.UpdatedAt,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan admin order: %w", scanErr)
		}
		orders = append(orders, o)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admin orders: %w", err)
	}
	orderIndexes := make(map[string]int, len(orders))
	orderIDs := make([]string, 0, len(orders))
	for i := range orders {
		orders[i].Items = make([]models.OrderItem, 0)
		orderIndexes[orders[i].ID] = i
		orderIDs = append(orderIDs, orders[i].ID)
	}
	if len(orders) > 0 {

		itemRows, err := r.db.Pool.Query(ctx, `
			SELECT oi.id, oi."orderId", oi."productId", oi.quantity, oi."unitPrice", oi."gstPercent",
			       oi."gstAmount", oi."codFee", oi."otherCharge", oi.customization, oi."createdAt",
			       p.name, p.slug
			FROM "OrderItem" oi
			LEFT JOIN "Product" p ON oi."productId" = p.id
			WHERE oi."orderId" = ANY($1::text[])
			ORDER BY oi."createdAt" ASC;
		`, orderIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to query admin order items: %w", err)
		}
		for itemRows.Next() {
			var item models.OrderItem
			var product models.Product
			var productName, productSlug *string
			if scanErr := itemRows.Scan(
				&item.ID, &item.OrderID, &item.ProductID, &item.Quantity, &item.UnitPrice, &item.GSTPercent,
				&item.GSTAmount, &item.CODFee, &item.OtherCharge, &item.Customization, &item.CreatedAt,
				&productName, &productSlug,
			); scanErr != nil {
				itemRows.Close()
				return nil, fmt.Errorf("failed to scan admin order item: %w", scanErr)
			}
			if productName != nil {
				product.Name = *productName
			}
			if productSlug != nil {
				product.Slug = *productSlug
			}
			if product.Name == "" {
				product.Name = "Product unavailable"
			}
			item.Product = &product
			index, exists := orderIndexes[item.OrderID]
			if exists {
				orders[index].Items = append(orders[index].Items, item)
			}
		}
		if err := itemRows.Err(); err != nil {
			itemRows.Close()
			return nil, fmt.Errorf("failed while reading admin order items: %w", err)
		}
		itemRows.Close()
	}
	refundRows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderId", reason, amount, "refundUpiId", status, "adminNote", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"
		FROM "RefundRequest" WHERE "orderId" = ANY($1::text[]) ORDER BY "createdAt" DESC;
	`, orderIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query refund requests: %w", err)
	}
	defer refundRows.Close()
	byOrder := make(map[string][]models.RefundRequest)
	for refundRows.Next() {
		var request models.RefundRequest
		if err := refundRows.Scan(&request.ID, &request.OrderID, &request.Reason, &request.Amount, &request.RefundUPIID, &request.Status, &request.AdminNote, &request.ReviewedBy, &request.ReviewedAt, &request.CreatedAt, &request.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan refund request: %w", err)
		}
		byOrder[request.OrderID] = append(byOrder[request.OrderID], request)
	}
	if err := refundRows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading refund requests: %w", err)
	}
	for i := range orders {
		orders[i].RefundRequests = byOrder[orders[i].ID]
	}
	return newPage(orders, page, pageSize, total), nil
}

// UpdateOrderStatus updates order status and tracking fields
func (r *OrderRepository) UpdateOrderStatus(ctx context.Context, orderID string, status string, trackingNumber, partner, estDelivery *string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin order update: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var paymentMethod, paymentStatus string
	if err := tx.QueryRow(ctx, `SELECT "paymentMethod", "paymentStatus" FROM "Order" WHERE id = $1 FOR UPDATE`, orderID).Scan(&paymentMethod, &paymentStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrOrderNotFound
		}
		return fmt.Errorf("failed to load order before update: %w", err)
	}
	if status == string(models.OrderStatusConfirmed) && strings.Contains(strings.ToLower(paymentMethod), "upi") && paymentStatus != string(models.PaymentStatusPaid) {
		return ErrUnpaidUPIOrderCannotConfirm
	}
	query := `
		UPDATE "Order"
		SET status = COALESCE(NULLIF($1, '')::"OrderStatus", status),
		    "trackingNumber" = COALESCE($2, "trackingNumber"),
		    "shippingPartner" = COALESCE($3, "shippingPartner"),
		    "estimatedDelivery" = COALESCE($4, "estimatedDelivery"),
		    "updatedAt" = NOW()
		WHERE id = $5;
	`
	if _, err := tx.Exec(ctx, query, status, trackingNumber, partner, estDelivery, orderID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// MarkCODPaymentCollected records cash collection as an audited payment transition.
func (r *OrderRepository) MarkCODPaymentCollected(ctx context.Context, orderID, adminEmail string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin COD collection: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var method, status string
	var amount int
	if err := tx.QueryRow(ctx, `SELECT "paymentMethod", "paymentStatus", "totalAmount" FROM "Order" WHERE id = $1 FOR UPDATE`, orderID).Scan(&method, &status, &amount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("order not found")
		}
		return fmt.Errorf("failed to load COD order: %w", err)
	}
	if !strings.Contains(strings.ToLower(method), "cash") && !strings.Contains(strings.ToLower(method), "cod") {
		return errors.New("cash collection can only be recorded for COD orders")
	}
	if status != string(models.PaymentStatusCODPendingCollection) {
		return errors.New("this order is not awaiting COD collection")
	}
	now := time.Now()
	if _, err := tx.Exec(ctx, `UPDATE "Order" SET "paymentStatus" = 'COD_COLLECTED', "updatedAt" = $1 WHERE id = $2`, now, orderID); err != nil {
		return fmt.Errorf("failed to update COD payment: %w", err)
	}
	_, err = tx.Exec(ctx, `INSERT INTO "PaymentLog" (id, "orderId", amount, status, provider, method, "verifiedBy", "verifiedAt", "createdAt") VALUES ($1, $2, $3, 'COD_COLLECTED', 'CASH_ON_DELIVERY', 'ADMIN_COD_COLLECTED', $4, $5, $5)`, generateID("plog"), orderID, amount, adminEmail, now)
	if err != nil {
		return fmt.Errorf("failed to record COD collection: %w", err)
	}
	return tx.Commit(ctx)
}

// GetDashboardStats aggregates total counts for admin dashboard
func (r *OrderRepository) GetDashboardStats(ctx context.Context) (*models.AdminDashboardStats, error) {
	var stats models.AdminDashboardStats
	err := r.db.Pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM "Order"),
			(SELECT COUNT(*) FROM "User" WHERE role = 'CUSTOMER'),
			(SELECT COUNT(*) FROM "Product" WHERE published = true),
			(SELECT COUNT(*) FROM "Order" WHERE status = 'PENDING');
	`).Scan(&stats.Orders, &stats.Users, &stats.Products, &stats.Pending)
	if err != nil {
		return nil, fmt.Errorf("failed to load admin dashboard stats: %w", err)
	}
	return &stats, nil
}

// CancelOrder cancels an order and increments product stock back in an atomic transaction
func (r *OrderRepository) CancelOrder(ctx context.Context, orderNumber, userEmail string, isAdmin bool) (*models.Order, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("transaction begin failed: %w", err)
	}
	defer tx.Rollback(ctx)

	var o models.Order
	var customerEmail, status, paymentStatus string
	query := `SELECT id, "orderNumber", "customerEmail", status, "paymentStatus", "totalAmount", "paymentMethod" FROM "Order" WHERE "orderNumber" = $1 FOR UPDATE;`
	err = tx.QueryRow(ctx, query, orderNumber).Scan(&o.ID, &o.OrderNumber, &customerEmail, &status, &paymentStatus, &o.TotalAmount, &o.PaymentMethod)
	if err != nil {
		return nil, errors.New("Order not found.")
	}

	if !isAdmin && customerEmail != userEmail {
		return nil, errors.New("You are not allowed to cancel this order.")
	}

	if status == "CANCELLED" {
		return &o, nil
	}

	if status != "PENDING" && status != "CONFIRMED" {
		return nil, errors.New("This order can no longer be cancelled.")
	}

	if paymentStatus == "PAID" {
		return nil, errors.New("Paid orders require a refund review. Please contact us to cancel.")
	}

	// Fetch items to release stock. Fail the whole transaction if stock cannot
	// be restored so the order is never marked cancelled inconsistently.
	rows, err := tx.Query(ctx, `SELECT "productId", quantity FROM "OrderItem" WHERE "orderId" = $1;`, o.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to load order items for cancellation: %w", err)
	}
	type stockRelease struct {
		productID string
		qty       int
	}
	var toRelease []stockRelease
	for rows.Next() {
		var sr stockRelease
		if err := rows.Scan(&sr.productID, &sr.qty); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to read order item for cancellation: %w", err)
		}
		toRelease = append(toRelease, sr)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, fmt.Errorf("failed while reading order items for cancellation: %w", err)
	}
	rows.Close()
	for _, item := range toRelease {
		if _, err := tx.Exec(ctx, `UPDATE "Product" SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2;`, item.qty, item.productID); err != nil {
			return nil, fmt.Errorf("failed to restore product stock: %w", err)
		}
	}

	// Update order
	_, err = tx.Exec(ctx, `UPDATE "Order" SET status = 'CANCELLED', "paymentStatus" = 'CANCELLED', "updatedAt" = NOW() WHERE id = $1;`, o.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel order: %w", err)
	}

	// Log event in PaymentLog
	if _, err := tx.Exec(ctx, `INSERT INTO "PaymentLog" (id, "orderId", amount, status, provider, method, "createdAt") VALUES (gen_random_uuid()::TEXT, $1, $2, 'CANCELLED', $3, 'ORDER_CANCELLATION', NOW());`, o.ID, o.TotalAmount, o.PaymentMethod); err != nil {
		return nil, fmt.Errorf("failed to record cancellation: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit failed: %w", err)
	}

	o.Status = models.OrderStatusCancelled
	o.PaymentStatus = models.PaymentStatusCancelled
	return &o, nil
}

// RequestRefund submits a customer refund request
func (r *OrderRepository) RequestRefund(ctx context.Context, orderID, userEmail, reason, refundUPI string) (*models.RefundRequest, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var customerEmail, paymentStatus string
	var totalAmount int
	err = tx.QueryRow(ctx, `SELECT "customerEmail", "paymentStatus", "totalAmount" FROM "Order" WHERE id = $1 FOR UPDATE;`, orderID).
		Scan(&customerEmail, &paymentStatus, &totalAmount)
	if err != nil {
		return nil, errors.New("Order not found.")
	}

	if customerEmail != userEmail {
		return nil, errors.New("You are not allowed to request a refund for this order.")
	}

	if paymentStatus != "PAID" && paymentStatus != "COD_COLLECTED" && paymentStatus != "REFUND_REJECTED" {
		return nil, errors.New("A refund can only be requested after payment has been received.")
	}

	// Check existing request
	var existingCount int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM "RefundRequest" WHERE "orderId" = $1 AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');`, orderID).Scan(&existingCount); err != nil {
		return nil, fmt.Errorf("failed to check existing refund requests: %w", err)
	}
	if existingCount > 0 {
		return nil, errors.New("A refund request is already in progress for this order.")
	}

	var req models.RefundRequest
	req.OrderID = orderID
	req.ID = generateID("refund")
	req.Reason = reason
	req.Amount = totalAmount
	req.RefundUPIID = refundUPI
	req.Status = "REQUESTED"

	err = tx.QueryRow(ctx, `
		INSERT INTO "RefundRequest" (id, "orderId", reason, amount, "refundUpiId", status, "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, 'REQUESTED', NOW(), NOW())
		RETURNING id, "createdAt", "updatedAt";
	`, req.ID, orderID, reason, totalAmount, refundUPI).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert refund request: %w", err)
	}

	if _, err := tx.Exec(ctx, `UPDATE "Order" SET "paymentStatus" = 'REFUND_REQUESTED', "updatedAt" = NOW() WHERE id = $1;`, orderID); err != nil {
		return nil, fmt.Errorf("failed to update order refund status: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO "PaymentLog" (id, "orderId", amount, status, provider, method, "createdAt") VALUES (gen_random_uuid()::TEXT, $1, $2, 'REFUND_REQUESTED', 'UPI', 'REFUND', NOW());`, orderID, totalAmount); err != nil {
		return nil, fmt.Errorf("failed to record refund request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit refund: %w", err)
	}

	return &req, nil
}

func (r *OrderRepository) UpdateRefundRequest(ctx context.Context, id, status, adminEmail, refundReference, adminNote string) error {
	valid := map[string]map[string]bool{
		"REQUESTED":  {"APPROVED": true, "REJECTED": true},
		"APPROVED":   {"PROCESSING": true, "REJECTED": true},
		"PROCESSING": {"COMPLETED": true},
	}
	status = strings.ToUpper(strings.TrimSpace(status))
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var orderID, current, orderStatus, orderPaymentStatus string
	var amount int
	var paymentMethod *string
	if err := tx.QueryRow(ctx, `
		SELECT rr."orderId", rr.status, o."paymentMethod", o.status, rr.amount, o."paymentStatus"
		FROM "RefundRequest" rr JOIN "Order" o ON o.id = rr."orderId"
		WHERE rr.id = $1 FOR UPDATE OF rr, o;
	`, id).Scan(&orderID, &current, &paymentMethod, &orderStatus, &amount, &orderPaymentStatus); err != nil {
		return errors.New("Refund request not found.")
	}
	if !valid[current][status] {
		return fmt.Errorf("refund status cannot change from %s to %s", current, status)
	}
	isCOD := paymentMethod != nil && (strings.Contains(strings.ToLower(*paymentMethod), "cash") || strings.Contains(strings.ToLower(*paymentMethod), "cod"))
	if orderPaymentStatus != string(models.PaymentStatusRefundRequested) {
		return fmt.Errorf("cannot move refund to %s while order payment status is %s", strings.ToLower(status), orderPaymentStatus)
	}
	if status == "APPROVED" && isCOD && orderStatus != "RETURN_APPROVED" && orderStatus != "RETURNED" {
		return errors.New("approve this COD refund after the return is marked Return Approved or Returned")
	}
	refundReference = strings.TrimSpace(refundReference)
	if status == "COMPLETED" && refundReference == "" {
		return errors.New("enter the refund UPI transaction reference before marking the refund complete")
	}
	_, err = tx.Exec(ctx, `UPDATE "RefundRequest" SET status = $1, "adminNote" = COALESCE(NULLIF($2, ''), "adminNote"), "reviewedBy" = $3, "reviewedAt" = NOW(), "updatedAt" = NOW() WHERE id = $4;`, status, strings.TrimSpace(adminNote), adminEmail, id)
	if err != nil {
		return err
	}
	if status == "COMPLETED" {
		_, err = tx.Exec(ctx, `UPDATE "Order" SET "paymentStatus" = 'REFUNDED', "updatedAt" = NOW() WHERE id = $1;`, orderID)
		if err == nil {
			_, err = tx.Exec(ctx, `INSERT INTO "PaymentLog" (id, "orderId", amount, status, provider, "providerReference", method, utr, "verifiedBy", "verifiedAt", "createdAt") VALUES ($1, $2, $3, 'REFUNDED', 'UPI', $4, 'ADMIN_REFUND', $5, $6, NOW(), NOW())`, generateID("plog"), orderID, amount, id, refundReference, adminEmail)
		}
	} else if status == "REJECTED" {
		paymentStatus := "PAID"
		if isCOD {
			paymentStatus = "COD_COLLECTED"
		}
		_, err = tx.Exec(ctx, `UPDATE "Order" SET "paymentStatus" = $1, "updatedAt" = NOW() WHERE id = $2;`, paymentStatus, orderID)
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
