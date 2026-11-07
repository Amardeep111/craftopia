package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type paymentSettingsRepository interface {
	GetSettings(context.Context) (*repository.StoreSettingsData, error)
}

type PaymentHandler struct {
	cfg         *config.Config
	settingRepo paymentSettingsRepository
}

func NewPaymentHandler(cfg *config.Config, settingRepo paymentSettingsRepository) *PaymentHandler {
	return &PaymentHandler{cfg: cfg, settingRepo: settingRepo}
}

// GetUPIDetails returns merchant UPI details and generates a deep-link
func (h *PaymentHandler) GetUPIDetails(w http.ResponseWriter, r *http.Request) {
	vpa := strings.TrimSpace(h.cfg.MerchantUPIID)
	name := strings.TrimSpace(h.cfg.MerchantPayeeName)
	whatsapp := strings.TrimSpace(h.cfg.WhatsAppNumber)
	if h.settingRepo != nil {
		settings, err := h.settingRepo.GetSettings(r.Context())
		if err != nil {
			slog.Error("Failed to load merchant payment settings", "error", err)
		} else if settings != nil {
			if settings.MerchantVPA != nil && strings.TrimSpace(*settings.MerchantVPA) != "" {
				vpa = strings.TrimSpace(*settings.MerchantVPA)
			}
			if strings.TrimSpace(settings.MerchantName) != "" {
				name = strings.TrimSpace(settings.MerchantName)
			}
			if settings.WhatsAppNumber != nil && strings.TrimSpace(*settings.WhatsAppNumber) != "" {
				whatsapp = strings.TrimSpace(*settings.WhatsAppNumber)
			}
		}
	}

	if vpa == "" {
		utils.Error(w, http.StatusServiceUnavailable, "UPI payments are not configured yet.")
		return
	}

	amount := r.URL.Query().Get("amount")
	if amount == "" {
		amount = "0.00"
	}

	orderID := r.URL.Query().Get("orderId")
	note := "Jamaes Craftopia order"
	if orderID != "" {
		note = fmt.Sprintf("Order %s", orderID)
	}

	escapeParam := func(s string) string {
		return strings.ReplaceAll(url.QueryEscape(s), "+", "%20")
	}

	deepLink := fmt.Sprintf("upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s", vpa, escapeParam(name), escapeParam(amount), escapeParam(note))

	utils.JSON(w, http.StatusOK, map[string]any{
		"vpa":            vpa,
		"name":           name,
		"whatsappNumber": whatsapp,
		"deepLink":       deepLink,
	})
}

type PaymentInitRequest struct {
	Method   string  `json:"method"`
	Details  any     `json:"details"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
}

// Initialize handles POST /api/payment/initialize
func (h *PaymentHandler) Initialize(w http.ResponseWriter, r *http.Request) {
	var req PaymentInitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid payment request payload.")
		return
	}

	if req.Method == "" || req.Amount <= 0 {
		utils.Error(w, http.StatusBadRequest, "Invalid payment request.")
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "INR"
	}

	providerRef := fmt.Sprintf("TEST_%s_%d", strings.ToUpper(req.Method), time.Now().UnixMilli())

	utils.JSON(w, http.StatusOK, map[string]any{
		"provider":          "test",
		"providerReference": providerRef,
		"amount":            req.Amount,
		"currency":          currency,
		"testMode":          true,
	})
}

type PaymentConfirmRequest struct {
	Method            string `json:"method"`
	ProviderReference string `json:"providerReference"`
	Details           any    `json:"details"`
}

// Confirm handles POST /api/payment/confirm
func (h *PaymentHandler) Confirm(w http.ResponseWriter, r *http.Request) {
	var req PaymentConfirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid payment confirmation payload.")
		return
	}

	if req.Method == "" {
		utils.Error(w, http.StatusBadRequest, "Missing payment method.")
		return
	}
	// Never accept client confirmation as proof of payment. This backend has no
	// configured server-side payment verifier, so report that verification is
	// unavailable instead of marking an order as paid.
	utils.Error(w, http.StatusServiceUnavailable, "Payment verification is not configured. No payment was verified.")
}

type PaymentFeeRequest struct {
	Method string  `json:"method"`
	Amount float64 `json:"amount"`
}

// Fee handles POST /api/payment/fee
func (h *PaymentHandler) Fee(w http.ResponseWriter, r *http.Request) {
	var req PaymentFeeRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	fee := 0
	if req.Method == "cod" {
		fee = 0 // COD handling fee rule from paymentFees.js (currently 0)
	}

	utils.JSON(w, http.StatusOK, map[string]any{
		"fee":  fee,
		"free": fee == 0,
	})
}
