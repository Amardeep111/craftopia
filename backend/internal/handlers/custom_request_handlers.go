package handlers

import (
	"encoding/json"
	"net/http"

	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type CustomRequestHandler struct {
	repo *repository.CustomRequestRepository
}

func NewCustomRequestHandler(repo *repository.CustomRequestRepository) *CustomRequestHandler {
	return &CustomRequestHandler{repo: repo}
}

type CreateCustomRequestBody struct {
	Name    string `json:"name"`
	Contact string `json:"contact"`
	Idea    string `json:"idea"`
	Details string `json:"details"`
	Colors  string `json:"colors"`
	Budget  string `json:"budget"`
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

	var userID *string
	if claims, err := middleware.GetUserFromContext(r.Context()); err == nil && claims != nil {
		userID = &claims.UserID
	}

	created, err := h.repo.Create(r.Context(), userID, body.Name, body.Contact, body.Idea, body.Details, body.Colors, body.Budget)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.Success(w, http.StatusCreated, "Custom request submitted successfully", created)
}

func (h *CustomRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	requests, err := h.repo.List(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load custom requests")
		return
	}
	utils.JSON(w, http.StatusOK, requests)
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

