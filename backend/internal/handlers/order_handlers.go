package handlers

import (
	"encoding/json"
	"net/http"

	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type OrderHandler struct {
	repo *repository.OrderRepository
}

func NewOrderHandler(repo *repository.OrderRepository) *OrderHandler {
	return &OrderHandler{repo: repo}
}

func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req models.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.CustomerName == "" || req.CustomerEmail == "" || len(req.Items) == 0 {
		utils.Error(w, http.StatusBadRequest, "Customer name, email, and at least one item are required.")
		return
	}

	var userID *string
	if claims, err := middleware.GetUserFromContext(r.Context()); err == nil && claims != nil {
		userID = &claims.UserID
	}

	order, err := h.repo.CreateOrder(r.Context(), userID, &req)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.Success(w, http.StatusCreated, "Order created successfully", order)
}

func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	orderNumber := r.URL.Query().Get("orderNumber")

	if orderNumber != "" {
		order, err := h.repo.GetOrderByOrderNumber(r.Context(), orderNumber)
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, "Could not load order")
			return
		}
		if order == nil {
			utils.Error(w, http.StatusNotFound, "Order not found")
			return
		}
		utils.JSON(w, http.StatusOK, order)
		return
	}

	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Order ID or order number is required")
		return
	}

	order, err := h.repo.GetOrderByID(r.Context(), id)
	if err == nil && order != nil {
		utils.JSON(w, http.StatusOK, order)
		return
	}

	// Fallback to checking by order number
	order, err = h.repo.GetOrderByOrderNumber(r.Context(), id)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not load order")
		return
	}
	if order == nil {
		utils.Error(w, http.StatusNotFound, "Order not found")
		return
	}

	utils.JSON(w, http.StatusOK, order)
}

func (h *OrderHandler) ListOrGetOrders(w http.ResponseWriter, r *http.Request) {
	// If orderNumber query param is passed, allow guest lookup
	if orderNumber := r.URL.Query().Get("orderNumber"); orderNumber != "" {
		order, err := h.repo.GetOrderByOrderNumber(r.Context(), orderNumber)
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, "Failed to load order")
			return
		}
		if order == nil {
			utils.Error(w, http.StatusNotFound, "Order not found")
			return
		}
		utils.JSON(w, http.StatusOK, order)
		return
	}

	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to view your orders")
		return
	}

	orders, err := h.repo.GetOrdersByEmail(r.Context(), claims.Email)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to fetch orders")
		return
	}

	utils.JSON(w, http.StatusOK, orders)
}

type VerifyPaymentRequest struct {
	UTR string `json:"utr"`
}

func (h *OrderHandler) VerifyUPIPayment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Order ID is required")
		return
	}

	claims, _ := middleware.GetUserFromContext(r.Context())
	adminEmail := "admin@jamaescraftopia.com"
	if claims != nil && claims.Email != "" {
		adminEmail = claims.Email
	}

	var req VerifyPaymentRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	order, err := h.repo.VerifyUPIPayment(r.Context(), id, req.UTR, adminEmail)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.Success(w, http.StatusOK, "Payment verified and order confirmed successfully", order)
}
