package repository

import (
	"context"
	"errors"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/utils"
	
	"github.com/jackc/pgx/v5"
)

type SessionRepository struct {
	db *database.DB
}

func NewSessionRepository(db *database.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// Create generates a 32-byte hex token and inserts a session into PostgreSQL
func (r *SessionRepository) Create(ctx context.Context, userID string, duration time.Duration) (*models.Session, error) {
	token, err := utils.GenerateRandomHex(32)
	if err != nil {
		return nil, err
	}

	sessionID := utils.GenerateUUID()
	expiresAt := time.Now().Add(duration)

	query := `
		INSERT INTO "Session" (id, "userId", token, "expiresAt")
		VALUES ($1, $2, $3, $4)
		RETURNING id, "userId", token, "expiresAt", "revokedAt", "createdAt"
	`

	var s models.Session
	err = r.db.Pool.QueryRow(ctx, query, sessionID, userID, token, expiresAt).Scan(
		&s.ID, &s.UserID, &s.Token, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

// Verify retrieves an active, unrevoked, unexpired session and its associated user
func (r *SessionRepository) Verify(ctx context.Context, token string) (*models.Session, *models.User, error) {
	query := `
		SELECT 
			s.id, s."userId", s.token, s."expiresAt", s."revokedAt", s."createdAt",
			u.id, u.email, u.password, u.name, u.phone, u.role, u."adminActive", u.active, u."createdAt", u."updatedAt"
		FROM "Session" s
		JOIN "User" u ON s."userId" = u.id
		WHERE s.token = $1 AND s."revokedAt" IS NULL AND s."expiresAt" > NOW() AND u.active = true
	`

	var s models.Session
	var u models.User

	err := r.db.Pool.QueryRow(ctx, query, token).Scan(
		&s.ID, &s.UserID, &s.Token, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt,
		&u.ID, &u.Email, &u.Password, &u.Name, &u.Phone, &u.Role, &u.AdminActive, &u.Active, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, errors.New("invalid or expired session")
		}
		return nil, nil, err
	}

	s.User = &u
	return &s, &u, nil
}

// Invalidate marks a single session as revoked
func (r *SessionRepository) Invalidate(ctx context.Context, token string) error {
	query := `UPDATE "Session" SET "revokedAt" = NOW() WHERE token = $1 AND "revokedAt" IS NULL`
	_, err := r.db.Pool.Exec(ctx, query, token)
	return err
}

// InvalidateAll marks all active sessions for a user as revoked
func (r *SessionRepository) InvalidateAll(ctx context.Context, userID string) error {
	query := `UPDATE "Session" SET "revokedAt" = NOW() WHERE "userId" = $1 AND "revokedAt" IS NULL`
	_, err := r.db.Pool.Exec(ctx, query, userID)
	return err
}
