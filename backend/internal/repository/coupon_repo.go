package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"craftopia-backend/internal/database"
	"github.com/jackc/pgx/v5"
)

type CouponRepository struct {
	db *database.DB
}

func NewCouponRepository(db *database.DB) *CouponRepository {
	return &CouponRepository{db: db}
}

type Coupon struct {
	ID              string     `json:"id"`
	Code            string     `json:"code"`
	Label           string     `json:"label"`
	DiscountPercent int        `json:"discountPercent"`
	MinSubtotal     int        `json:"minSubtotal"`
	Active          bool       `json:"active"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	FirstTimeOnly   bool       `json:"firstTimeOnly"`
	MaxUses         int        `json:"maxUses"`
	CurrentUses     int        `json:"currentUses"`
}

type CouponValidationResult struct {
	Code          string  `json:"code"`
	Label         string  `json:"label"`
	Discount      float64 `json:"discount"` // fraction e.g. 0.10 for 10%
	MinSubtotal   int     `json:"minSubtotal"`
	FirstTimeOnly bool    `json:"firstTimeOnly"`
}

func (r *CouponRepository) ValidateCoupon(ctx context.Context, code string, subtotal int, userID *string) (*CouponValidationResult, error) {
	cleanCode := strings.ToUpper(strings.TrimSpace(code))
	if cleanCode == "" {
		return nil, errors.New("enter a valid coupon code")
	}

	query := `
		SELECT id, code, label, "discountPercent", "minSubtotal", active, "expiresAt", "firstTimeOnly", "maxUses", "currentUses"
		FROM "Coupon" WHERE code = $1 LIMIT 1;
	`
	var c Coupon
	err := r.db.Pool.QueryRow(ctx, query, cleanCode).Scan(
		&c.ID, &c.Code, &c.Label, &c.DiscountPercent, &c.MinSubtotal, &c.Active,
		&c.ExpiresAt, &c.FirstTimeOnly, &c.MaxUses, &c.CurrentUses,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("that coupon code is not valid")
		}
		return nil, fmt.Errorf("failed to query coupon: %w", err)
	}

	if !c.Active || (c.ExpiresAt != nil && c.ExpiresAt.Before(time.Now())) {
		return nil, errors.New("that coupon is expired or inactive")
	}

	if subtotal < c.MinSubtotal {
		return nil, fmt.Errorf("this coupon requires a minimum cart of ₹%d", c.MinSubtotal)
	}

	if c.MaxUses > 0 && c.CurrentUses >= c.MaxUses {
		return nil, errors.New("this coupon has reached its maximum usage limit")
	}

	if c.FirstTimeOnly && userID != nil {
		var used bool
		uErr := r.db.Pool.QueryRow(ctx, `
			SELECT true FROM "CouponUsage" WHERE "couponId" = $1 AND "userId" = $2 LIMIT 1;
		`, c.ID, *userID).Scan(&used)
		if uErr == nil && used {
			return nil, errors.New("this is a first-time-only coupon and has already been used")
		}
	}

	return &CouponValidationResult{
		Code:          c.Code,
		Label:         c.Label,
		Discount:      float64(c.DiscountPercent) / 100.0,
		MinSubtotal:   c.MinSubtotal,
		FirstTimeOnly: c.FirstTimeOnly,
	}, nil
}
