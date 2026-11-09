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
		SELECT id, name, slug, description, accent, image, COALESCE(published, true), COALESCE(hidden, false), COALESCE("order", 0), "createdAt", "updatedAt"
		FROM "Category"
		WHERE COALESCE("softDeleted", false) = false AND published = true AND hidden = false
		ORDER BY "order" ASC, name ASC;
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	categories := make([]models.Category, 0)
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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading categories: %w", err)
	}
	return categories, nil
}

func (r *ProductRepository) GetAllCategoriesAdmin(ctx context.Context) ([]models.Category, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, name, slug, description, accent, image, COALESCE(published, true), COALESCE(hidden, false), COALESCE("order", 0), "createdAt", "updatedAt"
		FROM "Category"
		WHERE COALESCE("softDeleted", false) = false
		ORDER BY "order" ASC, name ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query admin categories: %w", err)
	}
	defer rows.Close()

	categories := make([]models.Category, 0)
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Accent, &c.Image,
			&c.Published, &c.Hidden, &c.Order, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan admin category: %w", err)
		}
		categories = append(categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admin categories: %w", err)
	}
	return categories, nil
}

func (r *ProductRepository) GetCategoryByID(ctx context.Context, id string) (*models.Category, error) {
	var c models.Category
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, name, slug, description, accent, image, COALESCE(published, true), COALESCE(hidden, false), COALESCE("order", 0), "createdAt", "updatedAt"
		FROM "Category"
		WHERE id = $1 AND COALESCE("softDeleted", false) = false;
	`, id).Scan(&c.ID, &c.Name, &c.Slug, &c.Description, &c.Accent, &c.Image,
		&c.Published, &c.Hidden, &c.Order, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get category: %w", err)
	}
	return &c, nil
}

func (r *ProductRepository) GetProducts(ctx context.Context, categorySlug string, featuredOnly bool, limit, skip int) ([]models.Product, error) {
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", COALESCE(p.price, 0), COALESCE(p."discountPercent", 0), COALESCE(p."gstPercent", 0),
		       COALESCE(p."codFee", 0), COALESCE(p."otherCharge", 0), COALESCE(p.featured, false), p.short, p.description, p.materials, p.care,
		       p.customization, p.visual, p.palette, p.images, p."imageUrl", p."cloudinaryPublicId",
		       COALESCE(p.stock, 0), COALESCE(p.published, false), COALESCE(p."availableForSale", true),
		       COALESCE(p."unavailableStates", ARRAY[]::TEXT[]), COALESCE(p."unavailablePinCodes", ARRAY[]::TEXT[]),
		       COALESCE(p."allowedPaymentMethods", ARRAY['upi']::TEXT[]), p."createdAt", p."updatedAt",
		       COALESCE(c.id, p."categoryId"), COALESCE(c.name, ''), COALESCE(c.slug, '')
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE COALESCE(p."softDeleted", false) = false
		  AND COALESCE(c."softDeleted", false) = false
		  AND p.published = true AND c.published = true AND c.hidden = false
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

	query += fmt.Sprintf(" ORDER BY p.\"createdAt\" DESC LIMIT $%d OFFSET $%d;", argID, argID+1)
	args = append(args, limit, skip)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	products := make([]models.Product, 0)
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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading products: %w", err)
	}
	return products, nil
}

func (r *ProductRepository) GetProductByIDOrSlug(ctx context.Context, identifier string) (*models.Product, error) {
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", COALESCE(p.price, 0), COALESCE(p."discountPercent", 0), COALESCE(p."gstPercent", 0),
		       COALESCE(p."codFee", 0), COALESCE(p."otherCharge", 0), COALESCE(p.featured, false), p.short, p.description, p.materials, p.care,
		       p.customization, p.visual, p.palette, p.images, p."imageUrl", p."cloudinaryPublicId",
		       COALESCE(p.stock, 0), COALESCE(p.published, false), COALESCE(p."availableForSale", true),
		       COALESCE(p."unavailableStates", ARRAY[]::TEXT[]), COALESCE(p."unavailablePinCodes", ARRAY[]::TEXT[]),
		       COALESCE(p."allowedPaymentMethods", ARRAY['upi']::TEXT[]), p."createdAt", p."updatedAt",
		       COALESCE(c.id, p."categoryId"), COALESCE(c.name, ''), COALESCE(c.slug, '')
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE (p.id = $1 OR p.slug = $1)
		  AND COALESCE(p."softDeleted", false) = false
		  AND COALESCE(c."softDeleted", false) = false
		  AND p.published = true
		  AND c.published = true
		  AND c.hidden = false
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

// GetAdminProductByID returns the full record for editing, excluding soft-deleted products.
func (r *ProductRepository) GetAdminProductByID(ctx context.Context, id string) (*models.Product, error) {
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", COALESCE(p.price, 0), COALESCE(p."discountPercent", 0), COALESCE(p."gstPercent", 0),
		       COALESCE(p."codFee", 0), COALESCE(p."otherCharge", 0), COALESCE(p.featured, false), p.short, p.description, p.materials, p.care,
		       p.customization, p.visual, p.palette, p.images, p."imageUrl", p."cloudinaryPublicId",
		       COALESCE(p.stock, 0), COALESCE(p.published, false), COALESCE(p."availableForSale", true),
		       COALESCE(p."unavailableStates", ARRAY[]::TEXT[]), COALESCE(p."unavailablePinCodes", ARRAY[]::TEXT[]),
		       COALESCE(p."allowedPaymentMethods", ARRAY['upi']::TEXT[]), p."createdAt", p."updatedAt",
		       COALESCE(c.id, p."categoryId"), COALESCE(c.name, ''), COALESCE(c.slug, '')
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE p.id = $1 AND COALESCE(p."softDeleted", false) = false
		LIMIT 1;
	`
	var product models.Product
	var category models.Category
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&product.ID, &product.Name, &product.Slug, &product.CategoryID, &product.Price, &product.DiscountPercent, &product.GSTPercent,
		&product.CODFee, &product.OtherCharge, &product.Featured, &product.Short, &product.Description, &product.Materials, &product.Care,
		&product.Customization, &product.Visual, &product.Palette, &product.Images, &product.ImageURL, &product.CloudinaryPublicID,
		&product.Stock, &product.Published, &product.AvailableForSale, &product.UnavailableStates, &product.UnavailablePinCodes,
		&product.AllowedPaymentMethods, &product.CreatedAt, &product.UpdatedAt,
		&category.ID, &category.Name, &category.Slug,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get admin product: %w", err)
	}
	product.Category = &category
	return &product, nil
}

// GetAllProductsAdmin returns one searchable page of products, excluding soft-deleted products.
func (r *ProductRepository) GetAllProductsAdmin(ctx context.Context, page, pageSize int, search string) (*PageResult[models.AdminProductSummary], error) {
	pattern := "%" + search + "%"
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE COALESCE(p."softDeleted", false) = false
		  AND ($1 = '' OR p.name ILIKE $2 OR p.slug ILIKE $2 OR c.name ILIKE $2);
	`, search, pattern).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count admin products: %w", err)
	}
	offset := (page - 1) * pageSize
	query := `
		SELECT p.id, p.name, p.slug, p."categoryId", COALESCE(p.price, 0), COALESCE(p."discountPercent", 0), COALESCE(p."gstPercent", 0),
		       COALESCE(p."codFee", 0), COALESCE(p."otherCharge", 0), COALESCE(p.featured, false),
		       p.visual, p.palette, p.images, p."imageUrl",
		       COALESCE(p.stock, 0), COALESCE(p.published, false), COALESCE(p."availableForSale", true),
		       COALESCE(p."unavailableStates", ARRAY[]::TEXT[]), COALESCE(p."unavailablePinCodes", ARRAY[]::TEXT[]),
		       COALESCE(p."allowedPaymentMethods", ARRAY['upi']::TEXT[]),
		       COALESCE(c.id, p."categoryId"), COALESCE(c.name, ''), COALESCE(c.slug, '')
		FROM "Product" p
		LEFT JOIN "Category" c ON p."categoryId" = c.id
		WHERE COALESCE(p."softDeleted", false) = false
		  AND ($1 = '' OR p.name ILIKE $2 OR p.slug ILIKE $2 OR c.name ILIKE $2)
		ORDER BY p.name ASC, p.id ASC
		LIMIT $3 OFFSET $4;
	`
	rows, err := r.db.Pool.Query(ctx, query, search, pattern, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query admin product page: %w", err)
	}
	defer rows.Close()

	products := make([]models.AdminProductSummary, 0)
	for rows.Next() {
		var p models.AdminProductSummary
		var cat models.Category
		err := rows.Scan(
			&p.ID, &p.Name, &p.Slug, &p.CategoryID, &p.Price, &p.DiscountPercent, &p.GSTPercent,
			&p.CODFee, &p.OtherCharge, &p.Featured, &p.Visual, &p.Palette, &p.Images, &p.ImageURL,
			&p.Stock, &p.Published, &p.AvailableForSale, &p.UnavailableStates, &p.UnavailablePinCodes,
			&p.AllowedPaymentMethods,
			&cat.ID, &cat.Name, &cat.Slug,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		p.Category = &cat
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admin product page: %w", err)
	}
	return newPage(products, page, pageSize, total), nil
}

// CreateProduct inserts a new product
func (r *ProductRepository) CreateProduct(ctx context.Context, p *models.Product) (*models.Product, error) {
	query := `
		INSERT INTO "Product" (
			id, name, slug, "categoryId", price, "discountPercent", "gstPercent",
			"codFee", "otherCharge", featured, short, description, materials, care,
			customization, visual, palette, images, "imageUrl", "cloudinaryPublicId",
			stock, published, "availableForSale", "unavailableStates", "unavailablePinCodes",
			"allowedPaymentMethods", "createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
			$15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW()
		) RETURNING id, "createdAt", "updatedAt";
	`
	err := r.db.Pool.QueryRow(ctx, query,
		p.ID, p.Name, p.Slug, p.CategoryID, p.Price, p.DiscountPercent, p.GSTPercent,
		p.CODFee, p.OtherCharge, p.Featured, p.Short, p.Description, p.Materials, p.Care,
		p.Customization, p.Visual, p.Palette, p.Images, p.ImageURL, p.CloudinaryPublicID,
		p.Stock, p.Published, p.AvailableForSale, p.UnavailableStates, p.UnavailablePinCodes,
		p.AllowedPaymentMethods,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// UpdateProduct updates product fields
func (r *ProductRepository) UpdateProduct(ctx context.Context, p *models.Product) error {
	query := `
		UPDATE "Product" SET
			name = $1, "categoryId" = $2, price = $3, "discountPercent" = $4,
			"gstPercent" = $5, "codFee" = $6, "otherCharge" = $7, featured = $8,
			short = $9, description = $10, materials = $11, care = $12,
			customization = $13, visual = $14, "imageUrl" = $15, "cloudinaryPublicId" = $16,
			stock = $17, published = $18, "availableForSale" = $19, "unavailableStates" = $20,
			"unavailablePinCodes" = $21, "allowedPaymentMethods" = $22, "updatedAt" = NOW()
		WHERE id = $23;
	`
	_, err := r.db.Pool.Exec(ctx, query,
		p.Name, p.CategoryID, p.Price, p.DiscountPercent,
		p.GSTPercent, p.CODFee, p.OtherCharge, p.Featured,
		p.Short, p.Description, p.Materials, p.Care,
		p.Customization, p.Visual, p.ImageURL, p.CloudinaryPublicID,
		p.Stock, p.Published, p.AvailableForSale, p.UnavailableStates,
		p.UnavailablePinCodes, p.AllowedPaymentMethods, p.ID,
	)
	return err
}

// DeleteProduct marks a product as soft-deleted
func (r *ProductRepository) DeleteProduct(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "Product"
		SET "softDeleted" = true, "deletedAt" = NOW(), "updatedAt" = NOW()
		WHERE id = $1;
	`, id)
	return err
}

// CreateCategory creates a category
func (r *ProductRepository) CreateCategory(ctx context.Context, c *models.Category) (*models.Category, error) {
	query := `
		INSERT INTO "Category" (id, name, slug, description, accent, image, published, hidden, "order", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING "createdAt", "updatedAt";
	`
	err := r.db.Pool.QueryRow(ctx, query,
		c.ID, c.Name, c.Slug, c.Description, c.Accent, c.Image, c.Published, c.Hidden, c.Order,
	).Scan(&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// UpdateCategory updates category
func (r *ProductRepository) UpdateCategory(ctx context.Context, c *models.Category) error {
	query := `
		UPDATE "Category" SET
			name = $1, description = $2, accent = $3, image = $4,
			published = $5, hidden = $6, "order" = $7, "updatedAt" = NOW()
		WHERE id = $8;
	`
	_, err := r.db.Pool.Exec(ctx, query,
		c.Name, c.Description, c.Accent, c.Image, c.Published, c.Hidden, c.Order, c.ID,
	)
	return err
}

// DeleteCategory marks a category as soft-deleted and cascades soft delete to its products
func (r *ProductRepository) DeleteCategory(ctx context.Context, id string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE "Category"
		SET "softDeleted" = true, "deletedAt" = NOW(), "updatedAt" = NOW()
		WHERE id = $1;
	`, id); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE "Product"
		SET "softDeleted" = true, "deletedAt" = NOW(), "updatedAt" = NOW()
		WHERE "categoryId" = $1;
	`, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
