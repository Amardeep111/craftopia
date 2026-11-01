package repository

import (
	"context"
	"fmt"
	"time"

	"craftopia-backend/internal/database"
)

type ReviewRepository struct {
	db *database.DB
}

func NewReviewRepository(db *database.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

type Review struct {
	ID               string    `json:"id"`
	ProductID        string    `json:"productId"`
	UserID           string    `json:"userId"`
	UserName         string    `json:"name"`
	ProductRating    int       `json:"productRating"`
	DeliveryRating   int       `json:"deliveryRating"`
	PackagingRating  int       `json:"packagingRating"`
	AverageRating    float64   `json:"rating"`
	Title            *string   `json:"title,omitempty"`
	Comment          string    `json:"text"`
	Images           []string  `json:"photos"`
	VerifiedPurchase bool      `json:"verifiedPurchase"`
	CreatedAt        time.Time `json:"date"`
}

func (r *ReviewRepository) GetProductReviews(ctx context.Context, productID string) ([]Review, error) {
	query := `
		SELECT r.id, r."productId", r."userId", COALESCE(u.name, 'Verified Customer'),
		       r."productRating", r."deliveryRating", r."packagingRating",
		       r.title, r.comment, r.images, r."createdAt"
		FROM "Review" r
		LEFT JOIN "User" u ON r."userId" = u.id
		WHERE r."productId" = $1
		ORDER BY r."createdAt" DESC;
	`
	rows, err := r.db.Pool.Query(ctx, query, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to load reviews: %w", err)
	}
	defer rows.Close()

	reviews := make([]Review, 0)
	for rows.Next() {
		var rev Review
		images := make([]string, 0)
		if err := rows.Scan(
			&rev.ID, &rev.ProductID, &rev.UserID, &rev.UserName,
			&rev.ProductRating, &rev.DeliveryRating, &rev.PackagingRating,
			&rev.Title, &rev.Comment, &images, &rev.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan review: %w", err)
		}
		rev.Images = images
		rev.AverageRating = float64(rev.ProductRating+rev.DeliveryRating+rev.PackagingRating) / 3.0
		rev.VerifiedPurchase = true
		reviews = append(reviews, rev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading reviews: %w", err)
	}
	return reviews, nil
}

type ContactRepository struct {
	db *database.DB
}

func NewContactRepository(db *database.DB) *ContactRepository {
	return &ContactRepository{db: db}
}

func (r *ContactRepository) SaveMessage(ctx context.Context, name, email, message string) (string, error) {
	id := generateID("msg")
	now := time.Now()
	query := `
		INSERT INTO "ContactMessage" (id, name, email, message, read, replied, "createdAt")
		VALUES ($1, $2, $3, $4, false, false, $5) RETURNING id;
	`
	var returnedID string
	err := r.db.Pool.QueryRow(ctx, query, id, name, email, message, now).Scan(&returnedID)
	return returnedID, err
}

func (r *ReviewRepository) CreateReview(ctx context.Context, rev *Review) (*Review, error) {
	id := generateID("rev")
	now := time.Now()
	query := `
		INSERT INTO "Review" (
			id, "productId", "userId", "productRating", "deliveryRating", "packagingRating",
			title, comment, images, "createdAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id;
	`
	err := r.db.Pool.QueryRow(ctx, query,
		id, rev.ProductID, rev.UserID, rev.ProductRating, rev.DeliveryRating, rev.PackagingRating,
		rev.Title, rev.Comment, rev.Images, now,
	).Scan(&rev.ID)
	if err != nil {
		return nil, err
	}
	rev.CreatedAt = now
	return rev, nil
}
