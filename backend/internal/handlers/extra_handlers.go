package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"

	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type ExtraHandlers struct {
	cartRepo    *repository.CartRepository
	couponRepo  *repository.CouponRepository
	addressRepo *repository.AddressRepository
	reviewRepo  *repository.ReviewRepository
	contactRepo *repository.ContactRepository
	orderRepo   *repository.OrderRepository
	userRepo    *repository.UserRepository
}

func NewExtraHandlers(
	cart *repository.CartRepository,
	coupon *repository.CouponRepository,
	address *repository.AddressRepository,
	review *repository.ReviewRepository,
	contact *repository.ContactRepository,
	order *repository.OrderRepository,
	user *repository.UserRepository,
) *ExtraHandlers {
	return &ExtraHandlers{
		cartRepo:    cart,
		couponRepo:  coupon,
		addressRepo: address,
		reviewRepo:  review,
		contactRepo: contact,
		orderRepo:   order,
		userRepo:    user,
	}
}

// --- Cart Handlers ---
func (h *ExtraHandlers) GetCart(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to load your saved cart.")
		return
	}
	items, err := h.cartRepo.GetCart(r.Context(), claims.UserID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, items)
}

func (h *ExtraHandlers) SaveCart(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to save your cart.")
		return
	}
	var body struct {
		Items []repository.CartItemInput `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid cart payload")
		return
	}
	if err := h.cartRepo.SaveCart(r.Context(), claims.UserID, body.Items); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Cart saved", body.Items)
}

func (h *ExtraHandlers) ValidateCart(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Items []repository.CartItemInput `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid cart payload")
		return
	}
	result, err := h.cartRepo.ValidateCart(r.Context(), body.Items)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, result)
}

// --- Coupon Handlers ---
func (h *ExtraHandlers) ListCoupons(w http.ResponseWriter, r *http.Request) {
	coupons, err := h.couponRepo.ListActiveCoupons(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load coupons")
		return
	}
	utils.JSON(w, http.StatusOK, coupons)
}

func (h *ExtraHandlers) ValidateCoupon(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code     string `json:"code"`
		Subtotal int    `json:"subtotal"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid coupon payload")
		return
	}

	var userID *string
	if claims, err := middleware.GetUserFromContext(r.Context()); err == nil && claims != nil {
		userID = &claims.UserID
	}

	res, err := h.couponRepo.ValidateCoupon(r.Context(), body.Code, body.Subtotal, userID)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, res)
}

// --- Address Handlers ---
func (h *ExtraHandlers) ListAddresses(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to view saved addresses")
		return
	}
	addresses, err := h.addressRepo.GetUserAddresses(r.Context(), claims.UserID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, addresses)
}

func (h *ExtraHandlers) CreateAddress(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to add an address")
		return
	}
	var addr repository.Address
	if err := json.NewDecoder(r.Body).Decode(&addr); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid address payload")
		return
	}
	created, err := h.addressRepo.CreateAddress(r.Context(), claims.UserID, &addr)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Address saved", created)
}

func (h *ExtraHandlers) UpdateAddress(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to update an address")
		return
	}
	var addr repository.Address
	if err := json.NewDecoder(r.Body).Decode(&addr); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid address payload")
		return
	}
	if err := h.addressRepo.UpdateAddress(r.Context(), claims.UserID, &addr); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Address updated", addr)
}

func (h *ExtraHandlers) DeleteAddress(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to delete an address")
		return
	}
	addrID := r.PathValue("id")
	if addrID == "" {
		addrID = r.URL.Query().Get("id")
	}
	if err := h.addressRepo.DeleteAddress(r.Context(), claims.UserID, addrID); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Address deleted", nil)
}

// --- Review Handlers ---
func (h *ExtraHandlers) GetProductReviews(w http.ResponseWriter, r *http.Request) {
	productID := r.PathValue("productId")
	reviews, err := h.reviewRepo.GetProductReviews(r.Context(), productID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{
		"reviews": reviews,
		"count":   len(reviews),
	})
}

func (h *ExtraHandlers) CreateProductReview(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to leave a review")
		return
	}
	productID := r.PathValue("productId")
	var rev repository.Review
	if err := json.NewDecoder(r.Body).Decode(&rev); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid review payload")
		return
	}
	rev.ProductID = productID
	rev.UserID = claims.UserID
	created, err := h.reviewRepo.CreateReview(r.Context(), &rev)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Review submitted", created)
}

// --- Contact Handlers ---
func (h *ExtraHandlers) CreateContactMessage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid contact payload")
		return
	}
	if body.Name == "" || body.Email == "" || body.Message == "" {
		utils.Error(w, http.StatusBadRequest, "Name, email, and message are required")
		return
	}
	id, err := h.contactRepo.SaveMessage(r.Context(), body.Name, body.Email, body.Message)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusCreated, "Message received. We will get back to you soon!", map[string]string{"id": id})
}

// --- Profile Handlers ---
func (h *ExtraHandlers) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Sign in to update profile")
		return
	}
	var body struct {
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid profile payload")
		return
	}
	if err := h.userRepo.UpdateProfile(r.Context(), claims.UserID, body.Name, body.Phone); err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.Success(w, http.StatusOK, "Profile updated successfully", nil)
}

// DetectLocation handles GET /api/location/detect
func (h *ExtraHandlers) DetectLocation(w http.ResponseWriter, r *http.Request) {
	latStr := r.Header.Get("x-vercel-ip-latitude")
	lngStr := r.Header.Get("x-vercel-ip-longitude")
	city := r.Header.Get("x-vercel-ip-city")
	region := r.Header.Get("x-vercel-ip-country-region")
	country := r.Header.Get("x-vercel-ip-country")
	if country == "" {
		country = "India"
	}
	postal := r.Header.Get("x-vercel-ip-postal-code")

	if latStr != "" && lngStr != "" {
		lat, latErr := strconv.ParseFloat(latStr, 64)
		lng, lngErr := strconv.ParseFloat(lngStr, 64)
		if latErr != nil || lngErr != nil || math.IsNaN(lat) || math.IsNaN(lng) || math.IsInf(lat, 0) || math.IsInf(lng, 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180 {
			utils.Error(w, http.StatusBadGateway, "Location data from the platform was invalid")
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{
			"source":  "vercel-ip",
			"lat":     lat,
			"lng":     lng,
			"city":    city,
			"state":   region,
			"country": country,
			"pinCode": postal,
		})
		return
	}

	utils.Error(w, http.StatusServiceUnavailable, "IP location is unavailable. Please enable browser location or enter your address manually.")
}

type GeocodeRequest struct {
	Lat any `json:"lat"`
	Lng any `json:"lng"`
}

// Geocode handles POST /api/geocode
func (h *ExtraHandlers) Geocode(w http.ResponseWriter, r *http.Request) {
	var req GeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Latitude and longitude are required.")
		return
	}

	var lat, lng float64
	switch v := req.Lat.(type) {
	case float64:
		lat = v
	case string:
		parsed, err := strconv.ParseFloat(v, 64)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Invalid coordinates.")
			return
		}
		lat = parsed
	}
	switch v := req.Lng.(type) {
	case float64:
		lng = v
	case string:
		parsed, err := strconv.ParseFloat(v, 64)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Invalid coordinates.")
			return
		}
		lng = parsed
	}

	if math.IsNaN(lat) || math.IsNaN(lng) || math.IsInf(lat, 0) || math.IsInf(lng, 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat == 0 && lng == 0) {
		utils.Error(w, http.StatusBadRequest, "Invalid coordinates.")
		return
	}

	utils.Error(w, http.StatusServiceUnavailable, "Reverse geocoding is not configured. Please enter your address manually.")
}
