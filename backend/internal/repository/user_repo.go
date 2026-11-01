package repository

import (
	"context"
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

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password, name, phone, role, "adminActive", active, "createdAt", "updatedAt"
		FROM "User" WHERE email = $1 LIMIT 1;
	`
	var u models.User
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Password, &u.Name, &u.Phone, &u.Role,
		&u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	_ = r.db.Pool.QueryRow(ctx, `SELECT "adminPermissions" FROM "User" WHERE id = $1;`, u.ID).Scan(&u.AdminPermissions)
	return &u, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return r.GetByEmail(ctx, email)
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*models.User, error) {
	var u models.User
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id, email, password, name, phone, role, "adminActive", active, "createdAt", "updatedAt"
		FROM "User" WHERE id = $1;
	`, id).Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}
	_ = r.db.Pool.QueryRow(ctx, `SELECT "adminPermissions" FROM "User" WHERE id = $1;`, u.ID).Scan(&u.AdminPermissions)
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
			id, email, password, name, phone, role, "adminActive", active, "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', false, true, $6, $7)
		RETURNING id, email, name, phone, role, active, "createdAt", "updatedAt";
	`
	var u models.User
	err = r.db.Pool.QueryRow(ctx, query, id, email, string(hashed), name, phone, now, now).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}
	return &u, nil
}

func (r *UserRepository) VerifyPassword(hashedPassword, plainPassword string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword)) == nil
}

// ListAllUsersAdmin returns customers for the admin dashboard
func (r *UserRepository) ListAllUsersAdmin(ctx context.Context) ([]models.User, error) {
	query := `
		SELECT id, email, name, phone, role, "adminActive", active, "createdAt", "updatedAt"
		FROM "User" WHERE role = 'CUSTOMER' ORDER BY "createdAt" DESC;
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt,
		); err == nil {
			users = append(users, u)
		}
	}
	return users, nil
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
		SELECT id, email, name, phone, role, "adminActive", "adminPermissions", active, "createdAt", "updatedAt"
		FROM "User" WHERE role IN ('ADMIN', 'SUPERADMIN') ORDER BY email ASC;
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	admins := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.AdminPermissions, &u.Active, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		admins = append(admins, u)
	}
	return admins, rows.Err()
}

func (r *UserRepository) SetAdminAccess(ctx context.Context, id, name string, active bool, permissions []string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "User" SET role = 'ADMIN', "adminActive" = $1,
			"adminPermissions" = $2, name = COALESCE(NULLIF($3, ''), name), "updatedAt" = NOW()
		WHERE id = $4;
	`, active, permissions, name, id)
	return err
}

func (r *UserRepository) RemoveAdminAccess(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE "User" SET role = 'CUSTOMER', "adminActive" = false,
			"adminPermissions" = ARRAY[]::TEXT[], "updatedAt" = NOW()
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
