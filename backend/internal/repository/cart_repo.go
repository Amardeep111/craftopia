package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type CartRepository struct {
	db *database.DB
}

var (
	ErrInvalidCartItem     = errors.New("cart item must include a product and a quantity between 1 and 99")
	ErrCartProductNotFound = errors.New("one or more cart products no longer exist")
)

func NewCartRepository(db *database.DB) *CartRepository {
	return &CartRepository{db: db}
}

type CartItemInput struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type ValidatedCartItem struct {
	ProductID             string   `json:"productId"`
	ProductName           string   `json:"productName"`
	UnitPrice             int      `json:"unitPrice"`
	OriginalPrice         int      `json:"originalPrice"`
	DiscountPercent       int      `json:"discountPercent"`
	GSTPercent            int      `json:"gstPercent"`
	GSTAmount             int      `json:"gstAmount"`
	CODFee                int      `json:"codFee"`
	OtherCharge           int      `json:"otherCharge"`
	Quantity              int      `json:"quantity"`
	LineTotal             int      `json:"lineTotal"`
	Stock                 int      `json:"stock"`
	AllowedPaymentMethods []string `json:"allowedPaymentMethods"`
}

type CartValidationResult struct {
	Items            []ValidatedCartItem `json:"items"`
	Subtotal         int                 `json:"subtotal"`
	GSTTotal         int                 `json:"gstTotal"`
	CODFeeTotal      int                 `json:"codFeeTotal"`
	OtherChargeTotal int                 `json:"otherChargeTotal"`
	Shipping         int                 `json:"shipping"`
	TotalAmount      int                 `json:"totalAmount"`
	Errors           []string            `json:"errors"`
}

func (r *CartRepository) GetCart(ctx context.Context, userID string) ([]models.CartItem, error) {
	query := `
		SELECT ci.id, ci."cartId", ci."productId", ci.quantity, ci."createdAt", ci."updatedAt",
		       p.name, p.slug, p.price, p."discountPercent", p."gstPercent", p."codFee",
		       p."otherCharge", p.stock, p.published, p."imageUrl"
		FROM "Cart" c
		JOIN "CartItem" ci ON c.id = ci."cartId"
		JOIN "Product" p ON ci."productId" = p.id
		WHERE c."userId" = $1
		ORDER BY ci."createdAt" ASC;
	`
	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to load cart items: %w", err)
	}
	defer rows.Close()

	items := make([]models.CartItem, 0)
	for rows.Next() {
		var it models.CartItem
		var p models.Product
		if scanErr := rows.Scan(
			&it.ID, &it.CartID, &it.ProductID, &it.Quantity, &it.CreatedAt, &it.UpdatedAt,
			&p.Name, &p.Slug, &p.Price, &p.DiscountPercent, &p.GSTPercent, &p.CODFee,
			&p.OtherCharge, &p.Stock, &p.Published, &p.ImageURL,
		); scanErr != nil {
			return nil, fmt.Errorf("failed to scan cart item: %w", scanErr)
		}
		it.Product = &p
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading cart items: %w", err)
	}
	return items, nil
}

func (r *CartRepository) SaveCart(ctx context.Context, userID string, items []CartItemInput) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Serialize cart creation per user because Supabase does not enforce a unique
	// constraint on Cart.userId.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0));`, userID); err != nil {
		return fmt.Errorf("failed to lock cart: %w", err)
	}
	// Reuse an existing cart, or create one when none exists.
	var cartID string
	err = tx.QueryRow(ctx, `SELECT id FROM "Cart" WHERE "userId" = $1 ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE;`, userID).Scan(&cartID)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `INSERT INTO "Cart" (id, "userId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING id;`, generateID("cart"), userID).Scan(&cartID)
	} else if err == nil {
		_, err = tx.Exec(ctx, `UPDATE "Cart" SET "updatedAt" = NOW() WHERE id = $1;`, cartID)
	}
	if err != nil {
		return fmt.Errorf("failed to upsert cart: %w", err)
	}

	// Clear existing items
	_, err = tx.Exec(ctx, `DELETE FROM "CartItem" WHERE "cartId" = $1;`, cartID)
	if err != nil {
		return fmt.Errorf("failed to clear old cart items: %w", err)
	}

	// Normalize duplicate product IDs and write all cart rows in one database call.
	productIndexes := make(map[string]int, len(items))
	productIDs := make([]string, 0, len(items))
	quantities := make([]int32, 0, len(items))
	for _, item := range items {
		productID := strings.TrimSpace(item.ProductID)
		if productID == "" || item.Quantity < 1 || item.Quantity > 99 {
			return ErrInvalidCartItem
		}
		if index, ok := productIndexes[productID]; ok {
			quantities[index] += int32(item.Quantity)
			if quantities[index] > 99 {
				quantities[index] = 99
			}
			continue
		}
		productIndexes[productID] = len(productIDs)
		productIDs = append(productIDs, productID)
		quantities = append(quantities, int32(item.Quantity))
	}

	// A single set-based insert avoids one database round trip per product and
	// lets us report stale product IDs as a client error instead of a FK 500.
	now := time.Now()
	itemIDs := make([]string, len(productIDs))
	for i := range itemIDs {
		itemIDs[i] = generateID("citem")
	}
	commandTag, err := tx.Exec(ctx, `
		INSERT INTO "CartItem" (id, "cartId", "productId", quantity, "createdAt", "updatedAt")
		SELECT item.id, $1, item.product_id, item.quantity, $5, $5
		FROM unnest($2::text[], $3::text[], $4::integer[]) AS item(id, product_id, quantity)
		JOIN "Product" p ON p.id = item.product_id;
	`, cartID, itemIDs, productIDs, quantities, now)
	if err != nil {
		return fmt.Errorf("failed to insert cart items: %w", err)
	}
	if commandTag.RowsAffected() != int64(len(productIDs)) {
		return ErrCartProductNotFound
	}

	return tx.Commit(ctx)
}

func (r *CartRepository) ValidateCart(ctx context.Context, items []CartItemInput) (*CartValidationResult, error) {
	validated := make([]ValidatedCartItem, 0)
	errList := make([]string, 0)

	var subtotal, gstTotal, codFeeTotal, otherChargeTotal int

	for _, it := range items {
		var p models.Product
		err := r.db.Pool.QueryRow(ctx, `
			SELECT id, name, price, COALESCE("discountPercent", 0), COALESCE("gstPercent", 0), COALESCE("codFee", 0), COALESCE("otherCharge", 0), stock, COALESCE(published, false), COALESCE("availableForSale", true), COALESCE("allowedPaymentMethods", ARRAY['upi']::TEXT[])
			FROM "Product" WHERE id = $1;
		`, it.ProductID).Scan(
			&p.ID, &p.Name, &p.Price, &p.DiscountPercent, &p.GSTPercent, &p.CODFee,
			&p.OtherCharge, &p.Stock, &p.Published, &p.AvailableForSale, &p.AllowedPaymentMethods,
		)
		if err != nil {
			errList = append(errList, fmt.Sprintf("Product %s not found or unavailable.", it.ProductID))
			continue
		}

		if !p.Published || !p.AvailableForSale {
			errList = append(errList, fmt.Sprintf("%s is temporarily unavailable for purchase.", p.Name))
			continue
		}

		qty := it.Quantity
		if qty < 1 {
			qty = 1
		} else if qty > 99 {
			qty = 99
		}

		if p.Stock < qty {
			errList = append(errList, fmt.Sprintf("Only %d available in stock for %s.", p.Stock, p.Name))
			continue
		}

		unitPrice := int(math.Round(float64(p.Price*(100-p.DiscountPercent)) / 100.0))
		lineTotal := unitPrice * qty
		gstAmount := int(math.Round(float64(unitPrice*p.GSTPercent) / 100.0))

		validated = append(validated, ValidatedCartItem{
			ProductID:             p.ID,
			ProductName:           p.Name,
			UnitPrice:             unitPrice,
			OriginalPrice:         p.Price,
			DiscountPercent:       p.DiscountPercent,
			GSTPercent:            p.GSTPercent,
			GSTAmount:             gstAmount,
			CODFee:                p.CODFee,
			OtherCharge:           p.OtherCharge,
			Quantity:              qty,
			LineTotal:             lineTotal,
			Stock:                 p.Stock,
			AllowedPaymentMethods: p.AllowedPaymentMethods,
		})

		subtotal += lineTotal
		gstTotal += gstAmount * qty
		codFeeTotal += p.CODFee * qty
		otherChargeTotal += p.OtherCharge * qty
	}

	shipping := 49
	if subtotal >= 999 {
		shipping = 0
	}

	fee := gstTotal + codFeeTotal + otherChargeTotal
	totalAmount := subtotal + shipping + fee

	return &CartValidationResult{
		Items:            validated,
		Subtotal:         subtotal,
		GSTTotal:         gstTotal,
		CODFeeTotal:      codFeeTotal,
		OtherChargeTotal: otherChargeTotal,
		Shipping:         shipping,
		TotalAmount:      totalAmount,
		Errors:           errList,
	}, nil
}
