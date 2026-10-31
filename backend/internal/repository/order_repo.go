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
			SELECT id, name, price, "discountPercent", "gstPercent", "codFee", "otherCharge", stock
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

		unitPrice := int(math.Round(float64(p.Price * (100 - p.DiscountPercent)) / 100.0))
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
	fee := totalGST + totalCODFee + totalOther
	totalAmount := subtotal - discount + shipping + fee

	orderID := generateID("ord")
	orderNumber := generateOrderNumber()
	now := time.Now()

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
	if err == nil {
		defer itemsRows.Close()
		for itemsRows.Next() {
			var it models.OrderItem
			var p models.Product
			if scanErr := itemsRows.Scan(
				&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.UnitPrice, &it.GSTPercent,
				&it.GSTAmount, &it.CODFee, &it.OtherCharge, &it.Customization, &it.CreatedAt,
				&p.Name, &p.Slug,
			); scanErr == nil {
				it.Product = &p
				o.Items = append(o.Items, it)
			}
		}
	}

	// Fetch payment logs
	logsRows, err := r.db.Pool.Query(ctx, `
		SELECT id, "orderId", amount, status, provider, "providerReference", method, utr, "verifiedBy", "verifiedAt", "createdAt"
		FROM "PaymentLog" WHERE "orderId" = $1 ORDER BY "createdAt" DESC;
	`, o.ID)
	if err == nil {
		defer logsRows.Close()
		for logsRows.Next() {
			var l models.PaymentLog
			if scanErr := logsRows.Scan(
				&l.ID, &l.OrderID, &l.Amount, &l.Status, &l.Provider, &l.ProviderReference,
				&l.Method, &l.UTR, &l.VerifiedBy, &l.VerifiedAt, &l.CreatedAt,
			); scanErr == nil {
				o.PaymentLogs = append(o.PaymentLogs, l)
			}
		}
	}

	return &o, nil
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

	var orders []models.Order
	for rows.Next() {
		var o models.Order
		if scanErr := rows.Scan(
			&o.ID, &o.OrderNumber, &o.CustomerName, &o.CustomerEmail, &o.Status,
			&o.PaymentMethod, &o.PaymentStatus, &o.PaymentReference, &o.TotalAmount, &o.CreatedAt,
		); scanErr == nil {
			orders = append(orders, o)
		}
	}
	return orders, nil
}

// VerifyUPIPayment implements strict value checks:
// 1. Enter UTR before marking payment PAID on UPI order.
// 2. Cannot mark fulfillment CONFIRMED without payment verification.
// 3. Auto-advances fulfillment to CONFIRMED when paid.
// 4. Inserts audit payment log with admin email.
func (r *OrderRepository) VerifyUPIPayment(ctx context.Context, orderID string, utr string, adminEmail string) (*models.Order, error) {
	current, err := r.GetOrderByID(ctx, orderID)
	if err != nil || current == nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	cleanUTR := strings.TrimSpace(utr)
	if cleanUTR == "" && current.PaymentReference != nil {
		cleanUTR = *current.PaymentReference
	}

	if cleanUTR == "" {
		return nil, errors.New("enter the UPI transaction reference (UTR) before confirming payment")
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

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
	`, logID, orderID, current.TotalAmount, provider, cleanUTR, method, cleanUTR, adminEmail, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert audit payment log: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetOrderByID(ctx, orderID)
}

