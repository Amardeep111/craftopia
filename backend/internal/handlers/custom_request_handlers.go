package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"craftopia-backend/internal/email"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type CustomRequestHandler struct {
	repo   *repository.CustomRequestRepository
	mailer *email.Mailer
}

func NewCustomRequestHandler(repo *repository.CustomRequestRepository, mailer *email.Mailer) *CustomRequestHandler {
	return &CustomRequestHandler{repo: repo, mailer: mailer}
}

type CreateCustomRequestBody struct {
	Name            string   `json:"name"`
	Contact         string   `json:"contact"`
	Idea            string   `json:"idea"`
	Details         string   `json:"details"`
	Category        *string  `json:"category"`
	Colors          string   `json:"colors"`
	Budget          string   `json:"budget"`
	Occasion        *string  `json:"occasion"`
	ReferenceImages []string `json:"referenceImages"`
}

func (h *CustomRequestHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body CreateCustomRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if body.Name == "" || body.Contact == "" || body.Idea == "" || body.Details == "" {
		utils.Error(w, http.StatusBadRequest, "Name, contact, idea, and details are required")
		return
	}

	trimmedContact := strings.TrimSpace(strings.ToLower(body.Contact))
	if strings.Contains(trimmedContact, "@") && utils.IsDisposableEmail(trimmedContact) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}

	var userID *string
	if claims, err := middleware.GetUserFromContext(r.Context()); err == nil && claims != nil {
		userID = &claims.UserID
	}

	created, err := h.repo.Create(r.Context(), userID, body.Name, body.Contact, body.Idea, body.Details, body.Category, body.Colors, body.Budget, body.Occasion, body.ReferenceImages)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if h.mailer != nil {
		h.mailer.SendEmailBestEffort("custom-request-receipt", func() error {
			return h.mailer.SendCustomRequestReceipt(body.Contact, body.Name)
		})
		h.mailer.SendEmailBestEffort("custom-request-support-alert", func() error {
			return h.mailer.SendCustomRequestSupportAlert(body.Name, body.Contact, body.Idea)
		})
	}

	utils.Success(w, http.StatusCreated, "Custom request submitted successfully", created)
}

func (h *CustomRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	page, pageSize, err := parseAdminPagination(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	requests, err := h.repo.List(r.Context(), page, pageSize, adminSearch(r), strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("status"))))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load custom requests")
		return
	}
	utils.JSON(w, http.StatusOK, requests)
}

// Update handles PATCH /api/admin/custom-requests, including quote edits and
// the storefront admin's accept-and-create-order request shape.
func (h *CustomRequestHandler) Update(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID           string                             `json:"id"`
		Status       string                             `json:"status"`
		QuotedPrice  json.RawMessage                    `json:"quotedPrice"`
		AdminNotes   string                             `json:"adminNotes"`
		CreateOrder  bool                               `json:"createOrder"`
		OrderDetails *models.AcceptCustomRequestPayload `json:"orderDetails"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid custom request update payload")
		return
	}
	if body.ID == "" {
		utils.Error(w, http.StatusBadRequest, "Custom request ID is required")
		return
	}

	if body.CreateOrder {
		if body.OrderDetails == nil {
			utils.Error(w, http.StatusBadRequest, "Order details are required to accept this request")
			return
		}
		claims, _ := middleware.GetUserFromContext(r.Context())
		adminEmail := "admin@jamaescraftopia.com"
		if claims != nil && claims.Email != "" {
			adminEmail = claims.Email
		}
		order, err := h.repo.AcceptWithOrder(r.Context(), body.ID, body.OrderDetails, adminEmail)
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.Success(w, http.StatusOK, "Custom request accepted and order created successfully", map[string]any{"order": order})
		return
	}

	validStatus := map[string]bool{
		"NEW": true, "REVIEWING": true, "QUOTED": true, "ACCEPTED": true,
		"IN_PROGRESS": true, "COMPLETED": true, "DECLINED": true,
	}
	body.Status = strings.ToUpper(strings.TrimSpace(body.Status))
	if !validStatus[body.Status] {
		utils.Error(w, http.StatusBadRequest, "Invalid custom request status")
		return
	}

	var quotedPrice *int
	if len(body.QuotedPrice) > 0 && string(body.QuotedPrice) != "null" {
		raw := strings.TrimSpace(string(body.QuotedPrice))
		if strings.HasPrefix(raw, `"`) {
			if err := json.Unmarshal(body.QuotedPrice, &raw); err != nil {
				utils.Error(w, http.StatusBadRequest, "Invalid quoted price")
				return
			}
		}
		if raw != "" {
			value, err := strconv.Atoi(raw)
			if err != nil || value < 0 {
				utils.Error(w, http.StatusBadRequest, "Quoted price must be a non-negative integer")
				return
			}
			quotedPrice = &value
		}
	}

	updated, err := h.repo.Update(r.Context(), body.ID, body.Status, quotedPrice, body.AdminNotes)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Custom request updated successfully", updated)
}

func (h *CustomRequestHandler) AcceptAndCreateOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Custom request ID is required")
		return
	}

	var payload models.AcceptCustomRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid accept payload")
		return
	}

	if payload.BasePrice < 1 {
		utils.Error(w, http.StatusBadRequest, "Base price must be at least ₹1")
		return
	}
	if payload.CustomerName == "" || payload.CustomerEmail == "" {
		utils.Error(w, http.StatusBadRequest, "Customer name and email are required")
		return
	}

	claims, _ := middleware.GetUserFromContext(r.Context())
	adminEmail := "admin@jamaescraftopia.com"
	if claims != nil && claims.Email != "" {
		adminEmail = claims.Email
	}

	order, err := h.repo.AcceptWithOrder(r.Context(), id, &payload, adminEmail)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.Success(w, http.StatusOK, "Custom request accepted and order created successfully", order)
}
