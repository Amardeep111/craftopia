package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type AdminHandler struct {
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
	userRepo    *repository.UserRepository
	couponRepo  *repository.CouponRepository
	settingRepo *repository.SettingRepository
}

func NewAdminHandler(
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
	userRepo *repository.UserRepository,
	couponRepo *repository.CouponRepository,
	settingRepo *repository.SettingRepository,
) *AdminHandler {
	return &AdminHandler{
		orderRepo:   orderRepo,
		productRepo: productRepo,
		userRepo:    userRepo,
		couponRepo:  couponRepo,
		settingRepo: settingRepo,
	}
}

// GetDashboard returns summary statistics for the admin dashboard
func (h *AdminHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	stats, err := h.orderRepo.GetDashboardStats(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load dashboard metrics")
		return
	}
	utils.JSON(w, http.StatusOK, stats)
}

// ListOrders returns all orders
func (h *AdminHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	page, pageSize, err := parseAdminPagination(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	orders, err := h.orderRepo.GetAllOrdersAdmin(r.Context(), page, pageSize, adminSearch(r), r.URL.Query().Get("status"), r.URL.Query().Get("paymentStatus"), r.URL.Query().Get("customer"))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load orders")
		return
	}
	utils.JSON(w, http.StatusOK, orders)
}

// UpdateOrder updates order fulfillment status or tracking
func (h *AdminHandler) UpdateOrder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID                string  `json:"id"`
		Status            string  `json:"status"`
		TrackingNumber    *string `json:"trackingNumber"`
		ShippingPartner   *string `json:"shippingPartner"`
		EstimatedDelivery *string `json:"estimatedDelivery"`
		RefundRequestID   string  `json:"refundRequestId"`
		RefundStatus      string  `json:"refundStatus"`
		RefundReference   string  `json:"refundReference"`
		AdminNote         string  `json:"adminNote"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid order update payload")
		return
	}
	if body.RefundRequestID != "" {
		if len(body.RefundReference) > 80 || len(body.AdminNote) > 1000 {
			utils.Error(w, http.StatusBadRequest, "Refund reference must be 80 characters or fewer and admin notes must be 1,000 characters or fewer")
			return
		}
		claims, _ := middleware.GetUserFromContext(r.Context())
		adminEmail := "admin@jamaescraftopia.com"
		if claims != nil && claims.Email != "" {
			adminEmail = claims.Email
		}
		if err := h.orderRepo.UpdateRefundRequest(r.Context(), body.RefundRequestID, body.RefundStatus, adminEmail, body.RefundReference, body.AdminNote); err != nil {
			utils.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.Success(w, http.StatusOK, "Refund request updated", nil)
		return
	}

	id := body.ID
	if id == "" {
		id = r.PathValue("id")
	}
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Order ID is required")
		return
	}

	if err := h.orderRepo.UpdateOrderStatus(r.Context(), id, body.Status, body.TrackingNumber, body.ShippingPartner, body.EstimatedDelivery); err != nil {
		if errors.Is(err, repository.ErrUnpaidUPIOrderCannotConfirm) || errors.Is(err, repository.ErrOrderNotFound) {
			utils.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.Error(w, http.StatusInternalServerError, "Failed to update order")
		return
	}

	utils.Success(w, http.StatusOK, "Order updated successfully", nil)
}

// ListProducts returns all products
func (h *AdminHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	page, pageSize, err := parseAdminPagination(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	products, err := h.productRepo.GetAllProductsAdmin(r.Context(), page, pageSize, adminSearch(r))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load products")
		return
	}
	utils.JSON(w, http.StatusOK, products)
}

func (h *AdminHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	product, err := h.productRepo.GetAdminProductByID(r.Context(), r.PathValue("id"))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load product")
		return
	}
	if product == nil {
		utils.Error(w, http.StatusNotFound, "Product not found")
		return
	}
	utils.JSON(w, http.StatusOK, product)
}

// CreateProduct creates a new product
func (h *AdminHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid product payload")
		return
	}

	if p.ID == "" {
		p.ID = utils.GenerateUUID()
	}
	if p.Slug == "" {
		p.Slug = strings.ToLower(strings.ReplaceAll(p.Name, " ", "-"))
	}

	created, err := h.productRepo.CreateProduct(r.Context(), &p)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Product created successfully", created)
}

// UpdateProduct updates product
func (h *AdminHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid product payload")
		return
	}
	if id != "" {
		p.ID = id
	}

	if err := h.productRepo.UpdateProduct(r.Context(), &p); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Product updated successfully", p)
}

// DeleteProduct deletes product
func (h *AdminHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Product ID is required")
		return
	}
	if err := h.productRepo.DeleteProduct(r.Context(), id); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Product deleted successfully", nil)
}

// ListCategories returns categories
func (h *AdminHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.productRepo.GetAllCategoriesAdmin(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load categories")
		return
	}
	utils.JSON(w, http.StatusOK, categories)
}

// CreateCategory creates a category
func (h *AdminHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var c models.Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid category payload")
		return
	}
	if c.ID == "" {
		c.ID = utils.GenerateUUID()
	}
	if c.Slug == "" {
		c.Slug = strings.ToLower(strings.ReplaceAll(c.Name, " ", "-"))
	}
	created, err := h.productRepo.CreateCategory(r.Context(), &c)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Category created successfully", created)
}

// UpdateCategory updates category
func (h *AdminHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid category payload")
		return
	}
	var c models.Category
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(payload, &c); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid category payload")
		return
	}
	if err := json.Unmarshal(payload, &fields); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid category payload")
		return
	}
	if id == "" {
		id = c.ID
	}
	if c.ID == "" {
		c.ID = id
	}
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Category ID is required")
		return
	}
	existing, err := h.productRepo.GetCategoryByID(r.Context(), id)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load category")
		return
	}
	if existing == nil {
		utils.Error(w, http.StatusNotFound, "Category not found")
		return
	}
	c = *existing
	c.ID = id
	if _, ok := fields["name"]; ok {
		var value string
		_ = json.Unmarshal(fields["name"], &value)
		c.Name = value
	}
	if _, ok := fields["slug"]; ok {
		var value string
		_ = json.Unmarshal(fields["slug"], &value)
		c.Slug = value
	}
	if _, ok := fields["description"]; ok {
		_ = json.Unmarshal(fields["description"], &c.Description)
	}
	if _, ok := fields["accent"]; ok {
		_ = json.Unmarshal(fields["accent"], &c.Accent)
	}
	if _, ok := fields["image"]; ok {
		_ = json.Unmarshal(fields["image"], &c.Image)
	}
	if _, ok := fields["published"]; ok {
		_ = json.Unmarshal(fields["published"], &c.Published)
	}
	if _, ok := fields["hidden"]; ok {
		_ = json.Unmarshal(fields["hidden"], &c.Hidden)
	}
	if _, ok := fields["order"]; ok {
		_ = json.Unmarshal(fields["order"], &c.Order)
	}
	if err := h.productRepo.UpdateCategory(r.Context(), &c); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Category updated successfully", c)
}

// DeleteCategory deletes category
func (h *AdminHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Category ID is required")
		return
	}
	if err := h.productRepo.DeleteCategory(r.Context(), id); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Category deleted successfully", nil)
}

// ListUsers returns customers
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	page, pageSize, err := parseAdminPagination(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	users, err := h.userRepo.ListAllUsersAdmin(r.Context(), page, pageSize, adminSearch(r))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load users")
		return
	}
	utils.JSON(w, http.StatusOK, users)
}

// ToggleUser toggles active status
func (h *AdminHandler) ToggleUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID     string `json:"id"`
		Active bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if err := h.userRepo.ToggleUserActive(r.Context(), body.ID, body.Active); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "User updated successfully", nil)
}

// ListCoupons returns all coupons
func (h *AdminHandler) ListCoupons(w http.ResponseWriter, r *http.Request) {
	page, pageSize, err := parseAdminPagination(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	coupons, err := h.couponRepo.ListAllCouponsAdmin(r.Context(), page, pageSize, adminSearch(r))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load coupons")
		return
	}
	utils.JSON(w, http.StatusOK, coupons)
}

// CreateCoupon creates a coupon
func (h *AdminHandler) CreateCoupon(w http.ResponseWriter, r *http.Request) {
	var c repository.Coupon
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid coupon payload")
		return
	}
	if c.ID == "" {
		c.ID = utils.GenerateUUID()
	}
	c.Code = strings.ToUpper(strings.TrimSpace(c.Code))
	created, err := h.couponRepo.CreateCoupon(r.Context(), &c)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Coupon created successfully", created)
}

// ToggleCoupon updates active flag
func (h *AdminHandler) ToggleCoupon(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID     string `json:"id"`
		Active bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid payload")
		return
	}
	if err := h.couponRepo.ToggleCoupon(r.Context(), body.ID, body.Active); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Coupon updated successfully", nil)
}

// DeleteCoupon deletes coupon
func (h *AdminHandler) DeleteCoupon(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		utils.Error(w, http.StatusBadRequest, "Coupon ID is required")
		return
	}
	if err := h.couponRepo.DeleteCoupon(r.Context(), id); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Coupon deleted successfully", nil)
}

// GetSite returns site settings
func (h *AdminHandler) GetSite(w http.ResponseWriter, r *http.Request) {
	s, err := h.settingRepo.GetSettings(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load site settings")
		return
	}
	utils.JSON(w, http.StatusOK, s)
}

// UpdateSite updates site settings
func (h *AdminHandler) UpdateSite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MerchantVPA    *string         `json:"merchantVpa"`
		MerchantName   *string         `json:"merchantName"`
		WhatsAppNumber *string         `json:"whatsappNumber"`
		SiteContent    json.RawMessage `json:"siteContent"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid site settings payload")
		return
	}
	if err := h.settingRepo.UpdateSiteSettings(r.Context(), body.MerchantVPA, body.MerchantName, body.WhatsAppNumber, body.SiteContent); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Site settings updated", nil)
}

// GetAbout returns about content
func (h *AdminHandler) GetAbout(w http.ResponseWriter, r *http.Request) {
	s, err := h.settingRepo.GetSettings(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load about content")
		return
	}
	utils.JSON(w, http.StatusOK, s.AboutContent)
}

// UpdateAbout updates about content
func (h *AdminHandler) UpdateAbout(w http.ResponseWriter, r *http.Request) {
	var body json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid about payload")
		return
	}
	if err := h.settingRepo.UpdateAboutContent(r.Context(), body); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "About content updated", nil)
}
