package repository

import (
	"context"
	"encoding/json"

	"craftopia-backend/internal/database"
)

type SettingRepository struct {
	db *database.DB
}

func NewSettingRepository(db *database.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

type StoreSettingsData struct {
	MerchantVPA    *string         `json:"merchantVpa,omitempty"`
	MerchantName   string          `json:"merchantName"`
	WhatsAppNumber *string         `json:"whatsappNumber,omitempty"`
	AboutContent   json.RawMessage `json:"aboutContent,omitempty"`
	SiteContent    json.RawMessage `json:"siteContent,omitempty"`
}

func (r *SettingRepository) GetSettings(ctx context.Context) (*StoreSettingsData, error) {
	query := `
		SELECT "merchantVpa", "merchantName", "whatsappNumber", "aboutContent", "siteContent"
		FROM "StoreSetting" WHERE id = 'main' LIMIT 1;
	`
	var s StoreSettingsData
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&s.MerchantVPA, &s.MerchantName, &s.WhatsAppNumber, &s.AboutContent, &s.SiteContent,
	)
	if err != nil {
		// Return sensible defaults if record not initialized
		defaultName := "Jamae's Craftopia"
		return &StoreSettingsData{
			MerchantName: defaultName,
		}, nil
	}
	return &s, nil
}

func (r *SettingRepository) UpdateSiteSettings(ctx context.Context, merchantVPA, merchantName, whatsApp *string, siteContent json.RawMessage) error {
	query := `
		INSERT INTO "StoreSetting" (id, "merchantVpa", "merchantName", "whatsappNumber", "siteContent", "updatedAt")
		VALUES ('main', $1, COALESCE($2, 'Jamae''s Craftopia'), $3, $4, NOW())
		ON CONFLICT (id) DO UPDATE SET
			"merchantVpa" = COALESCE($1, "StoreSetting"."merchantVpa"),
			"merchantName" = COALESCE($2, "StoreSetting"."merchantName"),
			"whatsappNumber" = COALESCE($3, "StoreSetting"."whatsappNumber"),
			"siteContent" = COALESCE($4, "StoreSetting"."siteContent"),
			"updatedAt" = NOW();
	`
	_, err := r.db.Pool.Exec(ctx, query, merchantVPA, merchantName, whatsApp, siteContent)
	return err
}

func (r *SettingRepository) UpdateAboutContent(ctx context.Context, aboutContent json.RawMessage) error {
	query := `
		INSERT INTO "StoreSetting" (id, "aboutContent", "updatedAt")
		VALUES ('main', $1, NOW())
		ON CONFLICT (id) DO UPDATE SET
			"aboutContent" = $1,
			"updatedAt" = NOW();
	`
	_, err := r.db.Pool.Exec(ctx, query, aboutContent)
	return err
}
