package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestDetectLocationFallback(t *testing.T) {
	extraHandler := handlers.NewExtraHandlers(nil, nil, nil, nil, nil, nil, nil, nil)

	// Use RFC 5737 reserved test IP (192.0.2.1) so IP lookup cannot resolve coordinates,
	// verifying the safe country-only fallback regardless of runner's geographic location.
	req, err := http.NewRequest("GET", "/api/location/detect", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("x-forwarded-for", "192.0.2.1")

	rr := httptest.NewRecorder()
	extraHandler.DetectLocation(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Source  string  `json:"source"`
			Country string  `json:"country"`
			City    string  `json:"city"`
			Lat     float64 `json:"lat"`
			Lng     float64 `json:"lng"`
		} `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if !resp.Success {
		t.Fatalf("expected success true, got %+v", resp)
	}
	if resp.Data.Source != "country-default" || resp.Data.Country != "India" {
		t.Errorf("expected source country-default with country India, got %+v", resp)
	}
	if resp.Data.Lat != 0 || resp.Data.Lng != 0 || resp.Data.City != "" {
		t.Errorf("expected no fake coordinates or city in fallback, got %+v", resp)
	}
}

func TestDetectLocationIPLookupOrFallback(t *testing.T) {
	extraHandler := handlers.NewExtraHandlers(nil, nil, nil, nil, nil, nil, nil, nil)

	req, err := http.NewRequest("GET", "/api/location/detect", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	extraHandler.DetectLocation(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Source  string  `json:"source"`
			Country string  `json:"country"`
			City    string  `json:"city"`
			Lat     float64 `json:"lat"`
			Lng     float64 `json:"lng"`
		} `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if !resp.Success {
		t.Fatalf("expected success true, got %+v", resp)
	}
	if resp.Data.Source == "ipwhois" {
		if resp.Data.Country == "" || resp.Data.Lat == 0 || resp.Data.Lng == 0 {
			t.Errorf("expected valid ipwhois geolocation, got %+v", resp)
		}
	} else if resp.Data.Source == "country-default" {
		if resp.Data.Country != "India" {
			t.Errorf("expected default country India, got %+v", resp)
		}
	} else {
		t.Errorf("unexpected source: %q", resp.Data.Source)
	}
}

func TestDetectLocationVercelHeaders(t *testing.T) {
	extraHandler := handlers.NewExtraHandlers(nil, nil, nil, nil, nil, nil, nil, nil)

	req, err := http.NewRequest("GET", "/api/location/detect", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("x-vercel-ip-latitude", "12.9716")
	req.Header.Set("x-vercel-ip-longitude", "77.5946")
	req.Header.Set("x-vercel-ip-city", "Bengaluru")
	req.Header.Set("x-vercel-ip-country", "India")
	req.Header.Set("x-vercel-ip-country-region", "Karnataka")

	rr := httptest.NewRecorder()
	extraHandler.DetectLocation(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Success bool `json:"success"`
		Data    struct {
			Source  string  `json:"source"`
			Country string  `json:"country"`
			City    string  `json:"city"`
			Lat     float64 `json:"lat"`
			Lng     float64 `json:"lng"`
		} `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if !resp.Success || resp.Data.Source != "vercel-ip" || resp.Data.City != "Bengaluru" || resp.Data.Lat != 12.9716 {
		t.Errorf("expected vercel-ip Bengaluru data, got %+v", resp)
	}
}

func TestGeocodeInvalidCoords(t *testing.T) {
	extraHandler := handlers.NewExtraHandlers(nil, nil, nil, nil, nil, nil, nil, nil)

	req, err := http.NewRequest("POST", "/api/geocode", strings.NewReader(`{"lat": 0, "lng": 0}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	extraHandler.Geocode(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for 0,0 invalid coords, got %d", rr.Code)
	}
}

func TestForgotPasswordValidation(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	// Empty body
	req, err := http.NewRequest("POST", "/api/auth/forgot-password", strings.NewReader(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.ForgotPassword(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for empty email, got %d", rr.Code)
	}
}

func TestResetPasswordValidation(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	// Short OTP
	req, err := http.NewRequest("POST", "/api/auth/reset-password", strings.NewReader(`{"challengeId": "test", "otp": "123", "password": "Password123"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.ResetPassword(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for short OTP, got %d", rr.Code)
	}
}

func TestVerifyOTPValidation(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	// Missing challenge ID
	req, err := http.NewRequest("POST", "/api/auth/verify", strings.NewReader(`{"challengeId": "", "otp": "123456"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.VerifyOTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 for empty challengeId, got %d", rr.Code)
	}
}

func TestSignupTempEmailBlocked(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	req, err := http.NewRequest("POST", "/api/auth/signup", strings.NewReader(`{"email": "scammer@mailinator.com", "password": "Password123"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.Signup(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for temp mail signup, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "disposable") {
		t.Errorf("expected disposable email error message, got %s", rr.Body.String())
	}
}

func TestLoginTempEmailBlocked(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	req, err := http.NewRequest("POST", "/api/auth/login", strings.NewReader(`{"email": "user@10minutemail.com", "password": "Password123"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.Login(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for temp mail login, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "disposable") {
		t.Errorf("expected disposable email error message, got %s", rr.Body.String())
	}
}

func TestSignupConfirmPasswordMismatch(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	req, err := http.NewRequest("POST", "/api/auth/signup", strings.NewReader(`{"email": "valid@gmail.com", "name": "Test User", "mobile": "9876543210", "password": "Password123", "confirmPassword": "DifferentPassword456"}`))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	authHandler.Signup(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for password mismatch, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "match") {
		t.Errorf("expected mismatch error message, got %s", rr.Body.String())
	}
}

func TestSignupValidationNameAndMobile(t *testing.T) {
	authHandler := handlers.NewAuthHandler(nil, nil, &config.Config{}, nil)

	// Missing name
	req1, _ := http.NewRequest("POST", "/api/auth/signup", strings.NewReader(`{"email": "valid@gmail.com", "mobile": "9876543210", "password": "Password123", "confirmPassword": "Password123"}`))
	req1.Header.Set("Content-Type", "application/json")
	rr1 := httptest.NewRecorder()
	authHandler.Signup(rr1, req1)
	if rr1.Code != http.StatusBadRequest || !strings.Contains(rr1.Body.String(), "full name") {
		t.Errorf("expected 400 for missing name, got %d: %s", rr1.Code, rr1.Body.String())
	}

	// Missing mobile
	req2, _ := http.NewRequest("POST", "/api/auth/signup", strings.NewReader(`{"email": "valid@gmail.com", "name": "Test User", "password": "Password123", "confirmPassword": "Password123"}`))
	req2.Header.Set("Content-Type", "application/json")
	rr2 := httptest.NewRecorder()
	authHandler.Signup(rr2, req2)
	if rr2.Code != http.StatusBadRequest || !strings.Contains(rr2.Body.String(), "mobile number") {
		t.Errorf("expected 400 for missing mobile, got %d: %s", rr2.Code, rr2.Body.String())
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
