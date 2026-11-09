package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository struct {
	db *database.DB
}

func NewUserRepository(db *database.DB) *UserRepository {
	return &UserRepository{db: db}
}

func decodeAdminPermissions(raw []byte) []string {
	if len(raw) == 0 || string(raw) == "null" {
		return []string{}
	}
	var permissions []string
	if err := json.Unmarshal(raw, &permissions); err != nil {
		return []string{}
	}
	if permissions == nil {
		return []string{}
	}
	return permissions
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password, name, phone, role, COALESCE("emailVerified", false),
		       COALESCE("adminActive", (role = 'SUPERADMIN')),
		       COALESCE(to_jsonb("adminPermissions"), '[]'::jsonb),
		       COALESCE(active, true), "createdAt", "updatedAt"
		FROM "User" WHERE email = $1 LIMIT 1;
	`
	var u models.User
	var permissionsJSON []byte
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Password, &u.Name, &u.Phone, &u.Role,
		&u.EmailVerified, &u.AdminActive, &permissionsJSON, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	u.AdminPermissions = decodeAdminPermissions(permissionsJSON)
	return &u, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return r.GetByEmail(ctx, email)
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	var permissionsJSON []byte
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, email, password, name, phone, role, COALESCE("emailVerified", false),
		       COALESCE("adminActive", (role = 'SUPERADMIN')),
		       COALESCE(to_jsonb("adminPermissions"), '[]'::jsonb),
		       COALESCE(active, true), "createdAt", "updatedAt"
		FROM "User" WHERE id = $1;
	`, id).Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Phone, &u.Role, &u.EmailVerified, &u.AdminActive, &permissionsJSON, &u.Active, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}
	u.AdminPermissions = decodeAdminPermissions(permissionsJSON)
	return &u, nil
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id, hashedPassword string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2;`, hashedPassword, id)
	return err
}

func (r *UserRepository) Create(ctx context.Context, email, plainPassword string, name, phone *string) (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	id := generateID("usr")
	now := time.Now()

	query := `
		INSERT INTO "User" (
			id, email, password, name, phone, role, "emailVerified", "adminActive", active, "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', false, false, true, $6, $7)
		RETURNING id, email, name, phone, role, "emailVerified", active, "createdAt", "updatedAt";
	`
	var u models.User
	err = r.db.Pool.QueryRow(ctx, query, id, email, string(hashed), name, phone, now, now).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.EmailVerified, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) VerifyPassword(hashedPassword, plainPassword string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword)) == nil
}

// ListAllUsersAdmin returns one searchable page of customers with order counts
// aggregated in SQL, avoiding a per-customer order-count query.
func (r *UserRepository) ListAllUsersAdmin(ctx context.Context, page, pageSize int, search string) (*PageResult[models.User], error) {
	pattern := "%" + search + "%"
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM "User" u
		WHERE UPPER(COALESCE(u.role, 'CUSTOMER')) NOT IN ('ADMIN', 'SUPERADMIN')
		  AND ($1 = '' OR u.email ILIKE $2 OR COALESCE(u.name, '') ILIKE $2 OR COALESCE(u.phone, '') ILIKE $2);
	`, search, pattern).Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count admin customers: %w", err)
	}
	offset := (page - 1) * pageSize
	query := `
		WITH user_page AS MATERIALIZED (
			SELECT u.id, u.email, u.name, u.phone, u.role,
			       COALESCE(u."adminActive", false) AS "adminActive",
			       COALESCE(u.active, true) AS active,
			       u."createdAt", u."updatedAt"
			FROM "User" u
			WHERE UPPER(COALESCE(u.role, 'CUSTOMER')) NOT IN ('ADMIN', 'SUPERADMIN')
			  AND ($1 = '' OR u.email ILIKE $2 OR COALESCE(u.name, '') ILIKE $2 OR COALESCE(u.phone, '') ILIKE $2)
			ORDER BY u."createdAt" DESC, u.id DESC
			LIMIT $3 OFFSET $4
		), order_counts AS (
			SELECT o."userId", COUNT(*) AS order_count
			FROM "Order" o
			JOIN user_page u ON u.id = o."userId"
			GROUP BY o."userId"
		)
		SELECT u.id, u.email, u.name, u.phone, u.role, u."adminActive", u.active,
		       u."createdAt", u."updatedAt", COALESCE(orders.order_count, 0)
		FROM user_page u
		LEFT JOIN order_counts orders ON orders."userId" = u.id
		ORDER BY u."createdAt" DESC, u.id DESC;
	`
	rows, err := r.db.Pool.Query(ctx, query, search, pattern, pageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query admin customers: %w", err)
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt, &u.OrderCount,
		); err != nil {
			return nil, fmt.Errorf("failed to scan admin customer: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admin customers: %w", err)
	}
	return newPage(users, page, pageSize, total), nil
}

// ToggleUserActive enables or disables user login
func (r *UserRepository) ToggleUserActive(ctx context.Context, id string, active bool) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE "User" SET active = $1, "updatedAt" = NOW() WHERE id = $2;`, active, id)
	return err
}

// UpdateProfile updates user display name and phone number
func (r *UserRepository) UpdateProfile(ctx context.Context, id string, name, phone *string) error {
	query := `
		UPDATE "User" SET
			name = COALESCE($1, name),
			phone = COALESCE($2, phone),
			"updatedAt" = NOW()
		WHERE id = $3;
	`
	_, err := r.db.Pool.Exec(ctx, query, name, phone, id)
	return err
}

func (r *UserRepository) ListAdmins(ctx context.Context) ([]models.User, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, email, name, phone, role,
		       COALESCE("adminActive", (role = 'SUPERADMIN')),
		       COALESCE(to_jsonb("adminPermissions"), '[]'::jsonb),
		       COALESCE(active, true), "createdAt", "updatedAt"
		FROM "User" WHERE UPPER(COALESCE(role, 'CUSTOMER')) IN ('ADMIN', 'SUPERADMIN') ORDER BY email ASC;
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query admins: %w", err)
	}
	defer rows.Close()
	admins := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		var permissionsJSON []byte
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &permissionsJSON, &u.Active, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan admin: %w", err)
		}
		u.AdminPermissions = decodeAdminPermissions(permissionsJSON)
		admins = append(admins, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while reading admins: %w", err)
	}
	return admins, nil
}

func (r *UserRepository) SetAdminAccess(ctx context.Context, id, name string, active bool, permissions []string) error {
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return fmt.Errorf("failed to encode admin permissions: %w", err)
	}
	_, err = r.db.Pool.Exec(ctx, `
		UPDATE "User" SET role = 'ADMIN', "adminActive" = $1,
			"adminPermissions" = $2::jsonb, name = COALESCE(NULLIF($3, ''), name), "updatedAt" = NOW()
		WHERE id = $4;
	`, active, string(permissionsJSON), name, id)
	return err
}

func (r *UserRepository) RemoveAdminAccess(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "User" SET role = 'CUSTOMER', "adminActive" = false,
			"adminPermissions" = '[]'::jsonb, "updatedAt" = NOW()
		WHERE id = $1 AND role = 'ADMIN';
	`, id)
	return err
}

// CreateAdmin creates or upgrades a user to ADMIN
func (r *UserRepository) CreateAdmin(ctx context.Context, email, name, plainPassword string) (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	existing, _ := r.GetByEmail(ctx, email)
	if existing != nil {
		_, err := r.db.Pool.Exec(ctx, `
			UPDATE "User" SET role = 'ADMIN', "adminActive" = true, name = COALESCE($1, name), "updatedAt" = NOW()
			WHERE id = $2;
		`, name, existing.ID)
		if err != nil {
			return nil, err
		}
		existing.Role = "ADMIN"
		existing.AdminActive = true
		return existing, nil
	}

	id := generateID("adm")
	now := time.Now()
	query := `
		INSERT INTO "User" (
			id, email, password, name, role, "adminActive", active, "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, 'ADMIN', true, true, $5, $6)
		RETURNING id, email, name, phone, role, "adminActive", active, "createdAt", "updatedAt";
	`
	var u models.User
	err = r.db.Pool.QueryRow(ctx, query, id, email, string(hashed), name, now, now).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	return &u, err
}

// UpdateAdmin modifies an administrator
func (r *UserRepository) UpdateAdmin(ctx context.Context, id string, name *string, active *bool) (*models.User, error) {
	query := `
		UPDATE "User" SET
			name = COALESCE($1, name),
			"adminActive" = COALESCE($2, "adminActive"),
			"updatedAt" = NOW()
		WHERE id = $3 AND role = 'ADMIN'
		RETURNING id, email, name, phone, role, "adminActive", active, "createdAt", "updatedAt";
	`
	var u models.User
	err := r.db.Pool.QueryRow(ctx, query, name, active, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	return &u, err
}

// RemoveAdminRole demotes an admin to customer
func (r *UserRepository) RemoveAdminRole(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "User" SET role = 'CUSTOMER', "adminActive" = false, "updatedAt" = NOW()
		WHERE id = $1;
	`, id)
	return err
}

func (r *UserRepository) CreateWithHashedPassword(ctx context.Context, email, hashedPassword string, name, phone *string, emailVerified bool) (*models.User, error) {
	id := generateID("usr")
	now := time.Now()

	query := `
		INSERT INTO "User" (
			id, email, password, name, phone, role, "emailVerified", "adminActive", active, "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', $6, false, true, $7, $8)
		RETURNING id, email, name, phone, role, "emailVerified", active, "createdAt", "updatedAt";
	`
	var u models.User
	err := r.db.Pool.QueryRow(ctx, query, id, email, hashedPassword, name, phone, emailVerified, now, now).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.EmailVerified, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) SetEmailVerified(ctx context.Context, userID string, verified bool) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE "User" SET "emailVerified" = $1, "updatedAt" = NOW() WHERE id = $2;`, verified, userID)
	return err
}

func (r *UserRepository) SetEmailVerifiedByEmail(ctx context.Context, email string, verified bool) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE "User" SET "emailVerified" = $1, "updatedAt" = NOW() WHERE email = $2;`, verified, email)
	return err
}

func (r *UserRepository) UpdateUserSignupDetails(ctx context.Context, id, hashedPassword string, name, phone *string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "User" 
		SET password = $1, name = COALESCE($2, name), phone = COALESCE($3, phone), "updatedAt" = NOW()
		WHERE id = $4;
	`, hashedPassword, name, phone, id)
	return err
}

func (r *UserRepository) CreateEmailVerification(ctx context.Context, email, codeHash string, payload any, expiresAt time.Time) (*models.EmailVerification, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	id := generateID("emv")
	query := `
		INSERT INTO "EmailVerification" (
			id, email, "codeHash", payload, attempts, resends, "expiresAt", "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, 0, 0, $5, NOW(), NOW())
		RETURNING id, email, "codeHash", payload, attempts, resends, "expiresAt", "consumedAt", "createdAt", "updatedAt";
	`
	var ev models.EmailVerification
	err = r.db.Pool.QueryRow(ctx, query, id, email, codeHash, string(payloadBytes), expiresAt).Scan(
		&ev.ID, &ev.Email, &ev.CodeHash, &ev.Payload, &ev.Attempts, &ev.Resends,
		&ev.ExpiresAt, &ev.ConsumedAt, &ev.CreatedAt, &ev.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert email verification: %w", err)
	}
	return &ev, nil
}

func (r *UserRepository) GetEmailVerification(ctx context.Context, id string) (*models.EmailVerification, error) {
	query := `
		SELECT id, email, "codeHash", payload, attempts, resends, "expiresAt", "consumedAt", "createdAt", "updatedAt"
		FROM "EmailVerification" WHERE id = $1;
	`
	var ev models.EmailVerification
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&ev.ID, &ev.Email, &ev.CodeHash, &ev.Payload, &ev.Attempts, &ev.Resends,
		&ev.ExpiresAt, &ev.ConsumedAt, &ev.CreatedAt, &ev.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query email verification: %w", err)
	}
	return &ev, nil
}

func (r *UserRepository) IncrementEmailVerificationAttempts(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE "EmailVerification" SET attempts = attempts + 1, "updatedAt" = NOW() WHERE id = $1;`, id)
	return err
}

func (r *UserRepository) UpdateEmailVerificationCode(ctx context.Context, id, newCodeHash string, expiresAt time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "EmailVerification" 
		SET "codeHash" = $1, attempts = 0, resends = resends + 1, "expiresAt" = $2, "updatedAt" = NOW()
		WHERE id = $3;
	`, newCodeHash, expiresAt, id)
	return err
}

func (r *UserRepository) ConsumeEmailVerification(ctx context.Context, id string) error {
	tag, err := r.db.Pool.Exec(ctx, `
		UPDATE "EmailVerification" 
		SET "consumedAt" = NOW(), "updatedAt" = NOW()
		WHERE id = $1 AND "consumedAt" IS NULL;
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("verification already consumed")
	}
	return nil
}

func (r *UserRepository) DeleteEmailVerification(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM "EmailVerification" WHERE id = $1;`, id)
	return err
}
