package handlers

import (
	"net/http"

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
		utils.Error(w, http.StatusInternalServerError, "Failed to load categories")
		return
	}
	utils.JSON(w, http.StatusOK, categories)
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	featured := r.URL.Query().Get("featured") == "true"

	products, err := h.repo.GetProducts(r.Context(), category, featured)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load products")
		return
	}
	utils.JSON(w, http.StatusOK, products)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	idOrSlug := r.PathValue("id")
	if idOrSlug == "" {
		utils.Error(w, http.StatusBadRequest, "Product ID or slug is required")
		return
	}

	product, err := h.repo.GetProductByIDOrSlug(r.Context(), idOrSlug)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to fetch product")
		return
	}
	if product == nil {
		utils.Error(w, http.StatusNotFound, "Product not found")
		return
	}

	utils.JSON(w, http.StatusOK, product)
}

