package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/utils"
)

type PaymentHandler struct {
	cfg *config.Config
}

func NewPaymentHandler(cfg *config.Config) *PaymentHandler {
	return &PaymentHandler{cfg: cfg}
}

func (h *PaymentHandler) GetUPIDetails(w http.ResponseWriter, r *http.Request) {
	vpa := strings.TrimSpace(h.cfg.MerchantUPIID)
	name := strings.TrimSpace(h.cfg.MerchantPayeeName)
	whatsapp := strings.TrimSpace(h.cfg.WhatsAppNumber)

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

	// Clean UPI deep link: keep literal '@' in pa without premature %40 encoding
	deepLink := fmt.Sprintf("upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s", vpa, name, amount, note)

	utils.JSON(w, http.StatusOK, map[string]any{
		"vpa":            vpa,
		"name":           name,
		"whatsappNumber": whatsapp,
		"deepLink":       deepLink,
	})
}

