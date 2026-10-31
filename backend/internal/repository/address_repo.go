package repository

import (
	"context"
	"fmt"
	"time"

	"craftopia-backend/internal/database"
)

type AddressRepository struct {
	db *database.DB
}

func NewAddressRepository(db *database.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

type Address struct {
	ID                string    `json:"id"`
	UserID            string    `json:"userId"`
	FullName          string    `json:"fullName"`
	MobileNumber      string    `json:"mobileNumber"`
	HouseFlatBuilding string    `json:"houseFlatBuilding"`
	AreaStreet        string    `json:"areaStreet"`
	Landmark          *string   `json:"landmark,omitempty"`
	City              string    `json:"city"`
	State             string    `json:"state"`
	PinCode           string    `json:"pinCode"`
	AddressType       string    `json:"addressType"`
	IsDefault         bool      `json:"isDefault"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

func (r *AddressRepository) GetUserAddresses(ctx context.Context, userID string) ([]Address, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, "userId", "fullName", "mobileNumber", "houseFlatBuilding", "areaStreet",
		       landmark, city, state, "pinCode", "addressType", "isDefault", "createdAt", "updatedAt"
		FROM "Address" WHERE "userId" = $1 ORDER BY "isDefault" DESC, "updatedAt" DESC;
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query addresses: %w", err)
	}
	defer rows.Close()

	var addresses []Address
	for rows.Next() {
		var a Address
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.FullName, &a.MobileNumber, &a.HouseFlatBuilding, &a.AreaStreet,
			&a.Landmark, &a.City, &a.State, &a.PinCode, &a.AddressType, &a.IsDefault, &a.CreatedAt, &a.UpdatedAt,
		); err == nil {
			addresses = append(addresses, a)
		}
	}
	return addresses, nil
}

func (r *AddressRepository) CreateAddress(ctx context.Context, userID string, addr *Address) (*Address, error) {
	id := generateID("addr")
	now := time.Now()

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if addr.IsDefault {
		_, _ = tx.Exec(ctx, `UPDATE "Address" SET "isDefault" = false WHERE "userId" = $1;`, userID)
	}

	query := `
		INSERT INTO "Address" (
			id, "userId", "fullName", "mobileNumber", "houseFlatBuilding", "areaStreet",
			landmark, city, state, "pinCode", "addressType", "isDefault", "createdAt", "updatedAt"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id, "createdAt", "updatedAt";
	`
	err = tx.QueryRow(ctx, query,
		id, userID, addr.FullName, addr.MobileNumber, addr.HouseFlatBuilding, addr.AreaStreet,
		addr.Landmark, addr.City, addr.State, addr.PinCode, addr.AddressType, addr.IsDefault, now, now,
	).Scan(&addr.ID, &addr.CreatedAt, &addr.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create address: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	addr.UserID = userID
	return addr, nil
}

func (r *AddressRepository) DeleteAddress(ctx context.Context, userID, addressID string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM "Address" WHERE id = $1 AND "userId" = $2;`, addressID, userID)
	return err
}
