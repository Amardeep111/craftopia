package repository

import (
	"context"
	"errors"
	"fmt"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"github.com/jackc/pgx/v5"
)

type ProductRepository struct {
	db *database.DB
}

func NewProductRepository(db *database.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) GetCategories(ctx context.Context) ([]models.Category, error) {
	query := `
		SELECT id, name, slug, description, accent, image, published, hidden, "order", "createdAt", "updatedAt"
		FROM "Category"
		WHERE published = true AND hidden = false
		ORDER BY "order" ASC, name ASC;
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		err := rows.Scan(
			&c.ID, &c.Name, &c.Slug, &c.Description, &c.Accent, &c.Image,
			&c.Published, &c.Hidden, &c.Order, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *ProductRepository) GetProducts(ctx context.Context, categorySlug string, featuredOnly bool) ([]models.Product, error) {
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", p.price, p."discountPercent", p."gstPercent",
		       p."codFee", p."otherCharge", p.featured, p.short, p.description, p.materials, p.care,
		       p.customization, p.visual, p.palette, p.images, p."imageUrl", p."cloudinaryPublicId",
		       p.stock, p.published, p."availableForSale", p."unavailableStates", p."unavailablePinCodes",
		       p."allowedPaymentMethods", p."createdAt", p."updatedAt",
		       c.id, c.name, c.slug
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE p.published = true
	`
	var args []any
	argID := 1

	if featuredOnly {
		query += fmt.Sprintf(" AND p.featured = $%d", argID)
		args = append(args, true)
		argID++
	}

	if categorySlug != "" {
		query += fmt.Sprintf(" AND c.slug = $%d", argID)
		args = append(args, categorySlug)
		argID++
	}

	query += ` ORDER BY p."createdAt" DESC;`

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		var cat models.Category
		err := rows.Scan(
			&p.ID, &p.Name, &p.Slug, &p.CategoryID, &p.Price, &p.DiscountPercent, &p.GSTPercent,
			&p.CODFee, &p.OtherCharge, &p.Featured, &p.Short, &p.Description, &p.Materials, &p.Care,
			&p.Customization, &p.Visual, &p.Palette, &p.Images, &p.ImageURL, &p.CloudinaryPublicID,
			&p.Stock, &p.Published, &p.AvailableForSale, &p.UnavailableStates, &p.UnavailablePinCodes,
			&p.AllowedPaymentMethods, &p.CreatedAt, &p.UpdatedAt,
			&cat.ID, &cat.Name, &cat.Slug,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		p.Category = &cat
		products = append(products, p)
	}
	return products, nil
}

func (r *ProductRepository) GetProductByIDOrSlug(ctx context.Context, identifier string) (*models.Product, error) {
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", p.price, p."discountPercent", p."gstPercent",
		       p."codFee", p."otherCharge", p.featured, p.short, p.description, p.materials, p.care,
		       p.customization, p.visual, p.palette, p.images, p."imageUrl", p."cloudinaryPublicId",
		       p.stock, p.published, p."availableForSale", p."unavailableStates", p."unavailablePinCodes",
		       p."allowedPaymentMethods", p."createdAt", p."updatedAt",
		       c.id, c.name, c.slug
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE p.id = $1 OR p.slug = $1
		LIMIT 1;
	`
	var p models.Product
	var cat models.Category
	err := r.db.Pool.QueryRow(ctx, query, identifier).Scan(
		&p.ID, &p.Name, &p.Slug, &p.CategoryID, &p.Price, &p.DiscountPercent, &p.GSTPercent,
		&p.CODFee, &p.OtherCharge, &p.Featured, &p.Short, &p.Description, &p.Materials, &p.Care,
		&p.Customization, &p.Visual, &p.Palette, &p.Images, &p.ImageURL, &p.CloudinaryPublicID,
		&p.Stock, &p.Published, &p.AvailableForSale, &p.UnavailableStates, &p.UnavailablePinCodes,
		&p.AllowedPaymentMethods, &p.CreatedAt, &p.UpdatedAt,
		&cat.ID, &cat.Name, &cat.Slug,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get product by id or slug: %w", err)
	}
	p.Category = &cat
	return &p, nil
}

