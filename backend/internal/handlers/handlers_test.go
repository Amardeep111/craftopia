package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/handlers"
	"craftopia-backend/internal/utils"
)

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

	paymentHandler := handlers.NewPaymentHandler(cfg)

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

