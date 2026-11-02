package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/handlers"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type fakePaymentSettingsRepository struct {
	settings *repository.StoreSettingsData
	err      error
}

func (f fakePaymentSettingsRepository) GetSettings(context.Context) (*repository.StoreSettingsData, error) {
	return f.settings, f.err
}

func TestHealthEndpoints(t *testing.T) {
	healthHandler := handlers.NewHealthHandler(nil)

	req, err := http.NewRequest("GET", "/health/live", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(healthHandler.Liveness)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var resp utils.APIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}

	if !resp.Success {
		t.Errorf("expected success true, got %v", resp.Success)
	}
}

func TestUPIDeepLinkGeneration(t *testing.T) {
	cfg := &config.Config{
		MerchantUPIID:     "amardeepsarkar8@okhdfcbank",
		MerchantPayeeName: "Jamae's Craftopia",
		WhatsAppNumber:    "916909476388",
	}

	paymentHandler := handlers.NewPaymentHandler(cfg, nil)

	req, err := http.NewRequest("GET", "/api/payment/upi-details?amount=499.00&orderId=ORD-1234", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(paymentHandler.GetUPIDetails)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var resp utils.APIResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}

	data, ok := resp.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any in data")
	}

	deepLink, ok := data["deepLink"].(string)
	if !ok || deepLink == "" {
		t.Fatalf("expected deepLink in response")
	}

	// Verify that deepLink preserves literal @ in VPA and does NOT contain %40
	expectedSub := "pa=amardeepsarkar8@okhdfcbank"
	if !contains(deepLink, expectedSub) {
		t.Errorf("deepLink %s does not contain raw VPA %s (might be mistakenly encoded as %%40)", deepLink, expectedSub)
	}
}

func TestUPIDetailsPreferDatabaseMerchantSettings(t *testing.T) {
	dbVPA := "6909476388@ybl"
	dbWhatsApp := "916909476388"
	settings := fakePaymentSettingsRepository{settings: &repository.StoreSettingsData{
		MerchantVPA:    &dbVPA,
		MerchantName:   "Jamae's Craftopia",
		WhatsAppNumber: &dbWhatsApp,
	}}
	cfg := &config.Config{
		MerchantUPIID:     "environment@upi",
		MerchantPayeeName: "Environment Merchant",
		WhatsAppNumber:    "9000000000",
	}
	paymentHandler := handlers.NewPaymentHandler(cfg, settings)
	request := httptest.NewRequest(http.MethodGet, "/api/payment/upi-details?amount=499.00&orderId=ORD-1234", nil)
	response := httptest.NewRecorder()
	paymentHandler.GetUPIDetails(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("handler returned status %d, want %d: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var result struct {
		Success bool `json:"success"`
		Data    struct {
			VPA            string `json:"vpa"`
			Name           string `json:"name"`
			WhatsAppNumber string `json:"whatsappNumber"`
			DeepLink       string `json:"deepLink"`
		} `json:"data"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if !result.Success {
		t.Fatal("expected a successful UPI details response")
	}
	if result.Data.VPA != dbVPA {
		t.Errorf("VPA = %q, want database value %q", result.Data.VPA, dbVPA)
	}
	if result.Data.Name != "Jamae's Craftopia" {
		t.Errorf("payee name = %q, want database value", result.Data.Name)
	}
	if result.Data.WhatsAppNumber != dbWhatsApp {
		t.Errorf("WhatsApp = %q, want database value %q", result.Data.WhatsAppNumber, dbWhatsApp)
	}
	if !contains(result.Data.DeepLink, "pa="+dbVPA) {
		t.Errorf("deep link %q does not use database VPA %q", result.Data.DeepLink, dbVPA)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || (len(s) > 0 && stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
