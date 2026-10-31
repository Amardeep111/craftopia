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
	return &u, nil
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

