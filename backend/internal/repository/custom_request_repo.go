package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type CustomRequestRepository struct {
	db *database.DB
}

func NewCustomRequestRepository(db *database.DB) *CustomRequestRepository {
	return &CustomRequestRepository{db: db}
}

func (r *CustomRequestRepository) Create(ctx context.Context, userID *string, name, contact, idea, details string, category *string, colors, budget string, occasion *string, referenceImages []string) (*models.CustomRequest, error) {
	id := generateID("creq")
	now := time.Now()

	query := `
		INSERT INTO "CustomRequest" (
			id, "userId", name, contact, idea, category, colors, budget, occasion, details, "referenceImages", status, "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NEW', $12, $13)
		RETURNING id, "userId", name, contact, idea, category, colors, budget, occasion, details, "referenceImages", status, "createdAt", "updatedAt";
	`
	var cr models.CustomRequest
	err := r.db.Pool.QueryRow(ctx, query, id, userID, name, contact, idea, category, colors, budget, occasion, details, referenceImages, now, now).Scan(
		&cr.ID, &cr.UserID, &cr.Name, &cr.Contact, &cr.Idea, &cr.Category, &cr.Colors, &cr.Budget, &cr.Occasion,
		&cr.Details, &cr.ReferenceImages, &cr.Status, &cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create custom request: %w", err)
	}
	return &cr, nil
}

func (r *CustomRequestRepository) List(ctx context.Context, page, pageSize int, search, status string) (*PageResult[models.CustomRequest], error) {
	pattern := "%" + search + "%"
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM "CustomRequest" cr
		WHERE ($1 = '' OR cr.name ILIKE $2 OR cr.contact ILIKE $2 OR cr.idea ILIKE $2 OR cr.details ILIKE $2 OR cr.status::text ILIKE $2)
		  AND ($3 = '' OR cr.status::text = $3);
	`, search, pattern, status).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count admin custom requests: %w", err)
	}
	offset := (page - 1) * pageSize
	query := `
		SELECT cr.id, cr."userId", cr.name, cr.contact, cr.idea, cr.category, cr.colors, cr.budget, cr.occasion,
		       cr.details, cr."referenceImages", cr."quotedPrice", cr.status, cr."adminNotes", cr."createdAt", cr."updatedAt"
		FROM "CustomRequest" cr
		WHERE ($1 = '' OR cr.name ILIKE $2 OR cr.contact ILIKE $2 OR cr.idea ILIKE $2 OR cr.details ILIKE $2 OR cr.status::text ILIKE $2)
		  AND ($3 = '' OR cr.status::text = $3)
		ORDER BY cr."createdAt" DESC, cr.id DESC
		LIMIT $4 OFFSET $5;
	`
	rows, err := r.db.Pool.Query(ctx, query, search, pattern, status, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query admin custom request page: %w", err)
	}
	defer rows.Close()

	list := make([]models.CustomRequest, 0)
	for rows.Next() {
		var cr models.CustomRequest
		err := rows.Scan(
			&cr.ID, &cr.UserID, &cr.Name, &cr.Contact, &cr.Idea, &cr.Category, &cr.Colors,
			&cr.Budget, &cr.Occasion, &cr.Details, &cr.ReferenceImages, &cr.QuotedPrice, &cr.Status, &cr.AdminNotes, &cr.CreatedAt, &cr.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan admin custom request: %w", err)
		}
		list = append(list, cr)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admin custom requests: %w", err)
	}
	return newPage(list, page, pageSize, total), nil
}

func (r *CustomRequestRepository) Update(ctx context.Context, id, status string, quotedPrice *int, adminNotes string) (*models.CustomRequest, error) {
	var cr models.CustomRequest
	err := r.db.Pool.QueryRow(ctx, `
		UPDATE "CustomRequest"
		SET status = $2, "quotedPrice" = $3, "adminNotes" = $4, "updatedAt" = NOW()
		WHERE id = $1
		RETURNING id, "userId", name, contact, idea, category, colors, budget, occasion, details,
		          "referenceImages", "quotedPrice", status, "adminNotes", "createdAt", "updatedAt";
	`, id, status, quotedPrice, adminNotes).Scan(
		&cr.ID, &cr.UserID, &cr.Name, &cr.Contact, &cr.Idea, &cr.Category, &cr.Colors,
		&cr.Budget, &cr.Occasion, &cr.Details, &cr.ReferenceImages, &cr.QuotedPrice,
		&cr.Status, &cr.AdminNotes, &cr.CreatedAt, &cr.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("custom request not found")
		}
		return nil, fmt.Errorf("failed to update custom request: %w", err)
	}
	return &cr, nil
}

// AcceptWithOrder handles the complete acceptance workflow:
// 1. Calculates GST, fee, and total.
// 2. Ensures the 'custom-order' placeholder product exists.
// 3. Atomically generates an Order with itemized GST.
// 4. Updates CustomRequest status to ACCEPTED and links Order number in notes.
func (r *CustomRequestRepository) AcceptWithOrder(ctx context.Context, requestID string, payload *models.AcceptCustomRequestPayload, adminEmail string) (*models.Order, error) {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var cr models.CustomRequest
	err = tx.QueryRow(ctx, `SELECT id, name, contact, idea, colors, details FROM "CustomRequest" WHERE id = $1;`, requestID).Scan(
		&cr.ID, &cr.Name, &cr.Contact, &cr.Idea, &cr.Colors, &cr.Details,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("custom request not found")
		}
		return nil, err
	}

	basePrice := payload.BasePrice
	gstPercent := payload.GSTPercent
	gstAmount := int(math.Round(float64(basePrice*gstPercent) / 100.0))
	shippingFee := payload.ShippingFee
	otherCharge := payload.OtherCharge
	fee := gstAmount + otherCharge
	totalAmount := basePrice + shippingFee + fee

	// Find or create 'custom-order' placeholder product
	var productID string
	err = tx.QueryRow(ctx, `SELECT id FROM "Product" WHERE slug = 'custom-order' LIMIT 1;`).Scan(&productID)
	if err != nil {
		// Category check
		var categoryID string
		catErr := tx.QueryRow(ctx, `SELECT id FROM "Category" LIMIT 1;`).Scan(&categoryID)
		if catErr != nil {
			categoryID = generateID("cat")
			_, _ = tx.Exec(ctx, `INSERT INTO "Category" (id, name, slug, "updatedAt") VALUES ($1, 'Custom Creations', 'custom-creations', NOW());`, categoryID)
		}

		productID = generateID("prod")
		_, err = tx.Exec(ctx, `
			INSERT INTO "Product" (
				id, name, slug, "categoryId", price, stock, published, short, description, "updatedAt"
			) VALUES ($1, 'Custom Order Piece', 'custom-order', $2, 0, 99999, false, 'Custom crafted piece', 'Handcrafted custom order piece made to customer specifications.', NOW());
		`, productID, categoryID)
		if err != nil {
			return nil, fmt.Errorf("failed to create custom placeholder product: %w", err)
		}
	}

	orderID := generateID("ord")
	orderNumber := generateOrderNumber()
	now := time.Now()

	method := "UPI"
	if payload.PaymentMethod != "" {
		method = payload.PaymentMethod
	}
	paymentStatus := models.PaymentStatusAwaitingVerification
	if method == "Cash on Delivery" {
		paymentStatus = models.PaymentStatusCODPendingCollection
	}

	notes := fmt.Sprintf("Custom Request #%s | Idea: %s | Note: %s", requestID, cr.Idea, payload.AdminNotes)

	_, err = tx.Exec(ctx, `
		INSERT INTO "Order" (
			id, "orderNumber", "customerName", "customerEmail", "customerPhone",
			"shippingAddress", status, "paymentMethod", "paymentStatus",
			"totalAmount", subtotal, discount, shipping, fee, notes, "estimatedDelivery",
			"createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3, $4, $5, $6, 'CONFIRMED', $7, $8, $9, $10, 0, $11, $12, $13, $14, $15, $16
		);
	`, orderID, orderNumber, payload.CustomerName, payload.CustomerEmail, payload.CustomerPhone,
		payload.ShippingAddress, method, paymentStatus, totalAmount, basePrice, shippingFee, fee, notes, payload.EstimatedDelivery, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to create order for custom request: %w", err)
	}

	// Insert Order Item
	itemID := generateID("item")
	customizationText := fmt.Sprintf("Custom Piece: %s", cr.Idea)
	_, err = tx.Exec(ctx, `
		INSERT INTO "OrderItem" (
			id, "orderId", "productId", quantity, "unitPrice", "gstPercent", "gstAmount",
			"codFee", "otherCharge", customization, "createdAt"
		) VALUES ($1, $2, $3, 1, $4, $5, $6, 0, $7, $8, $9);
	`, itemID, orderID, productID, basePrice, gstPercent, gstAmount, otherCharge, customizationText, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert custom order item: %w", err)
	}

	// Initial Payment Log
	logID := generateID("plog")
	_, err = tx.Exec(ctx, `
		INSERT INTO "PaymentLog" (
			id, "orderId", amount, status, provider, method, "verifiedBy", "createdAt"
		) VALUES ($1, $2, $3, $4, 'UPI', $5, $6, $7);
	`, logID, orderID, totalAmount, paymentStatus, method, adminEmail, now)
	if err != nil {
		return nil, fmt.Errorf("failed to insert custom order payment log: %w", err)
	}

	// Update Custom Request
	adminNoteUpdate := fmt.Sprintf("%s | Order created: %s (ID: %s)", payload.AdminNotes, orderNumber, orderID)
	_, err = tx.Exec(ctx, `
		UPDATE "CustomRequest"
		SET status = 'ACCEPTED',
		    "quotedPrice" = $1,
		    "adminNotes" = $2,
		    "updatedAt" = $3
		WHERE id = $4;
	`, totalAmount, adminNoteUpdate, now, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to update custom request: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &models.Order{
		ID:          orderID,
		OrderNumber: orderNumber,
		TotalAmount: totalAmount,
		Subtotal:    basePrice,
		Status:      models.OrderStatusConfirmed,
	}, nil
}
