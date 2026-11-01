package handlers

import (
	"log/slog"
	"net/http"
	"strconv"

	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type ProductHandler struct {
	repo *repository.ProductRepository
}

func NewProductHandler(repo *repository.ProductRepository) *ProductHandler {
	return &ProductHandler{repo: repo}
}

func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.repo.GetCategories(r.Context())
	if err != nil {
		slog.Error("Failed to load categories", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to load categories")
		return
	}
	utils.JSON(w, http.StatusOK, categories)
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	featured := r.URL.Query().Get("featured") == "true"
	limit := 100
	skip := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > 100 {
			utils.Error(w, http.StatusBadRequest, "limit must be between 1 and 100")
			return
		}
		limit = parsed
	}
	if raw := r.URL.Query().Get("skip"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 0 {
			utils.Error(w, http.StatusBadRequest, "skip must be a non-negative integer")
			return
		}
		skip = parsed
	}

	products, err := h.repo.GetProducts(r.Context(), category, featured, limit, skip)
	if err != nil {
		slog.Error("Failed to load products", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to load products")
		return
	}
	utils.JSON(w, http.StatusOK, products)
}

func (h *ProductHandler) ListPromotions(w http.ResponseWriter, r *http.Request) {
	products, err := h.repo.GetProducts(r.Context(), "", false, 100, 0)
	if err != nil {
		slog.Error("Failed to load product promotions", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to load promotions")
		return
	}
	promotions := make([]models.PromotionProduct, 0, len(products))
	for _, product := range products {
		promotions = append(promotions, models.PromotionProduct{
			ID: product.ID, DiscountPercent: product.DiscountPercent,
			GSTPercent: product.GSTPercent, CODFee: product.CODFee, OtherCharge: product.OtherCharge,
		})
	}
	utils.JSON(w, http.StatusOK, promotions)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	idOrSlug := r.PathValue("id")
	if idOrSlug == "" {
		utils.Error(w, http.StatusBadRequest, "Product ID or slug is required")
		return
	}

	product, err := h.repo.GetProductByIDOrSlug(r.Context(), idOrSlug)
	if err != nil {
		slog.Error("Failed to fetch product", "identifier", idOrSlug, "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to fetch product")
		return
	}
	if product == nil {
		utils.Error(w, http.StatusNotFound, "Product not found")
		return
	}

	utils.JSON(w, http.StatusOK, product)
}
