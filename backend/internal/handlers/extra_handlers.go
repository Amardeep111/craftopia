package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"craftopia-backend/internal/email"
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
	mailer      *email.Mailer
}

func NewExtraHandlers(
	cart *repository.CartRepository,
	coupon *repository.CouponRepository,
	address *repository.AddressRepository,
	review *repository.ReviewRepository,
	contact *repository.ContactRepository,
	order *repository.OrderRepository,
	user *repository.UserRepository,
	mailer *email.Mailer,
) *ExtraHandlers {
	return &ExtraHandlers{
		cartRepo:    cart,
		couponRepo:  coupon,
		addressRepo: address,
		reviewRepo:  review,
		contactRepo: contact,
		orderRepo:   order,
		userRepo:    user,
		mailer:      mailer,
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
		if errors.Is(err, repository.ErrInvalidCartItem) {
			utils.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, repository.ErrCartProductNotFound) {
			utils.Error(w, http.StatusBadRequest, "One or more cart products no longer exist. Refresh your cart.")
			return
		}
		slog.Error("Failed to save cart", "user_id", claims.UserID, "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to save cart")
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
	var payload struct {
		repository.Review
		CommentAlias string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid review payload")
		return
	}
	rev := payload.Review
	if strings.TrimSpace(rev.Comment) == "" && strings.TrimSpace(payload.CommentAlias) != "" {
		rev.Comment = strings.TrimSpace(payload.CommentAlias)
	}
	if strings.TrimSpace(rev.Comment) == "" {
		utils.Error(w, http.StatusBadRequest, "Please share your experience in the review comment.")
		return
	}
	rev.ProductID = productID
	rev.UserID = claims.UserID
	if rev.ProductRating <= 0 || rev.ProductRating > 5 {
		rev.ProductRating = 5
	}
	if rev.DeliveryRating <= 0 || rev.DeliveryRating > 5 {
		rev.DeliveryRating = rev.ProductRating
	}
	if rev.PackagingRating <= 0 || rev.PackagingRating > 5 {
		rev.PackagingRating = rev.ProductRating
	}
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
	body.Name = strings.TrimSpace(body.Name)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	body.Message = strings.TrimSpace(body.Message)

	if body.Name == "" || body.Email == "" || body.Message == "" {
		utils.Error(w, http.StatusBadRequest, "Name, email, and message are required")
		return
	}

	if utils.IsDisposableEmail(body.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}
	id, err := h.contactRepo.SaveMessage(r.Context(), body.Name, body.Email, body.Message)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if h.mailer != nil {
		h.mailer.SendEmailBestEffort("contact-receipt", func() error {
			return h.mailer.SendContactReceipt(body.Email, body.Name)
		})
		h.mailer.SendEmailBestEffort("contact-support-alert", func() error {
			return h.mailer.SendContactSupportAlert(body.Name, body.Email, body.Message)
		})
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

var indianStateCodeMap = map[string]string{
	"AN": "Andaman and Nicobar Islands",
	"AP": "Andhra Pradesh",
	"AR": "Arunachal Pradesh",
	"AS": "Assam",
	"BR": "Bihar",
	"CH": "Chandigarh",
	"CT": "Chhattisgarh",
	"DN": "Dadra and Nagar Haveli",
	"DD": "Daman and Diu",
	"DL": "Delhi",
	"GA": "Goa",
	"GJ": "Gujarat",
	"HR": "Haryana",
	"HP": "Himachal Pradesh",
	"JK": "Jammu and Kashmir",
	"JH": "Jharkhand",
	"KA": "Karnataka",
	"KL": "Kerala",
	"LA": "Ladakh",
	"LD": "Lakshadweep",
	"MP": "Madhya Pradesh",
	"MH": "Maharashtra",
	"MN": "Manipur",
	"ML": "Meghalaya",
	"MZ": "Mizoram",
	"NL": "Nagaland",
	"OR": "Odisha",
	"PB": "Punjab",
	"PY": "Puducherry",
	"RJ": "Rajasthan",
	"SK": "Sikkim",
	"TN": "Tamil Nadu",
	"TG": "Telangana",
	"TR": "Tripura",
	"UP": "Uttar Pradesh",
	"UT": "Uttarakhand",
	"WB": "West Bengal",
}

func normalizeCountry(c string) string {
	c = strings.TrimSpace(c)
	if strings.EqualFold(c, "IN") || strings.EqualFold(c, "IND") || strings.EqualFold(c, "India") || c == "" {
		return "India"
	}
	return c
}

func normalizeState(s string) string {
	s = strings.TrimSpace(s)
	if full, ok := indianStateCodeMap[strings.ToUpper(s)]; ok {
		return full
	}
	return s
}

func getStateFromPinPrefix(pin string) string {
	pin = strings.TrimSpace(pin)
	if len(pin) < 2 {
		return ""
	}
	switch pin[:2] {
	case "11":
		return "Delhi"
	case "12", "13":
		return "Haryana"
	case "14", "15":
		return "Punjab"
	case "16":
		return "Chandigarh"
	case "17":
		return "Himachal Pradesh"
	case "18", "19":
		return "Jammu and Kashmir"
	case "20", "21", "22", "23", "24", "25", "26", "27", "28":
		return "Uttar Pradesh"
	case "30", "31", "32", "33", "34":
		return "Rajasthan"
	case "36", "37", "38", "39":
		return "Gujarat"
	case "40", "41", "42", "43", "44":
		return "Maharashtra"
	case "45", "46", "47", "48":
		return "Madhya Pradesh"
	case "49":
		return "Chhattisgarh"
	case "50":
		return "Telangana"
	case "51", "52", "53":
		return "Andhra Pradesh"
	case "56", "57", "58", "59":
		return "Karnataka"
	case "60", "61", "62", "63", "64":
		return "Tamil Nadu"
	case "67", "68", "69":
		return "Kerala"
	case "70", "71", "72", "73", "74":
		return "West Bengal"
	case "75", "76", "77":
		return "Odisha"
	case "78":
		return "Assam"
	case "79":
		if len(pin) >= 3 {
			switch pin[:3] {
			case "790", "791", "792":
				return "Arunachal Pradesh"
			case "793", "794":
				return "Meghalaya"
			case "795":
				return "Manipur"
			case "796":
				return "Mizoram"
			case "797":
				return "Nagaland"
			case "798", "799":
				return "Tripura"
			}
		}
		return "Assam"
	case "80", "81", "82", "83", "84", "85":
		if pin[:2] == "82" || pin[:2] == "83" {
			return "Jharkhand"
		}
		return "Bihar"
	}
	return ""
}

func writeGeocodeResponse(w http.ResponseWriter, addr *GeocodeAddress) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"address": addr,
		"data": map[string]any{
			"address": addr,
		},
	})
}

// DetectLocation handles GET /api/location/detect
func (h *ExtraHandlers) DetectLocation(w http.ResponseWriter, r *http.Request) {
	// 1. Check for Vercel GeoIP headers (instant, 0ms, zero external calls)
	latStr := r.Header.Get("x-vercel-ip-latitude")
	lngStr := r.Header.Get("x-vercel-ip-longitude")
	city := r.Header.Get("x-vercel-ip-city")
	if city != "" {
		if unescaped, err := url.QueryUnescape(city); err == nil {
			city = unescaped
		}
	}
	region := normalizeState(r.Header.Get("x-vercel-ip-country-region"))
	country := normalizeCountry(r.Header.Get("x-vercel-ip-country"))
	postal := r.Header.Get("x-vercel-ip-postal-code")
	if region == "" && len(postal) >= 2 {
		region = getStateFromPinPrefix(postal)
	}

	if latStr != "" && lngStr != "" {
		lat, latErr := strconv.ParseFloat(latStr, 64)
		lng, lngErr := strconv.ParseFloat(lngStr, 64)
		if latErr == nil && lngErr == nil && !math.IsNaN(lat) && !math.IsNaN(lng) && !math.IsInf(lat, 0) && !math.IsInf(lng, 0) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 {
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
	}

	// 2. IP lookup fallback via ipwho.is with 2.5s timeout
	forwarded := r.Header.Get("x-forwarded-for")
	clientIP := ""
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		clientIP = strings.TrimSpace(parts[0])
	}
	if clientIP == "" || clientIP == "127.0.0.1" || clientIP == "::1" {
		if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
			clientIP = host
		}
	}

	isLocal := clientIP == "" || clientIP == "127.0.0.1" || clientIP == "::1" || strings.HasPrefix(clientIP, "192.168.") || strings.HasPrefix(clientIP, "10.") || strings.HasPrefix(clientIP, "172.16.")
	targetURL := "https://ipwho.is/"
	if !isLocal {
		targetURL = fmt.Sprintf("https://ipwho.is/%s", url.PathEscape(clientIP))
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2500*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err == nil {
		req.Header.Set("User-Agent", "JamaesCraftopia/1.0 (contact@jamaescraftopia.com)")
		client := &http.Client{Timeout: 2500 * time.Millisecond}
		res, err := client.Do(req)
		if err == nil {
			defer res.Body.Close()
			if res.StatusCode == http.StatusOK {
				var data struct {
					Success   *bool   `json:"success"`
					Latitude  float64 `json:"latitude"`
					Longitude float64 `json:"longitude"`
					City      string  `json:"city"`
					Region    string  `json:"region"`
					Country   string  `json:"country"`
					Postal    string  `json:"postal"`
				}
				if err := json.NewDecoder(res.Body).Decode(&data); err == nil {
					if (data.Success == nil || *data.Success) && data.Latitude != 0 && data.Longitude != 0 {
						c := normalizeCountry(data.Country)
						st := normalizeState(data.Region)
						if st == "" && len(data.Postal) >= 2 {
							st = getStateFromPinPrefix(data.Postal)
						}
						utils.JSON(w, http.StatusOK, map[string]any{
							"source":  "ipwhois",
							"lat":     data.Latitude,
							"lng":     data.Longitude,
							"city":    data.City,
							"state":   st,
							"country": c,
							"pinCode": data.Postal,
						})
						return
					}
				}
			}
		}
	}

	// 3. Fallback when coordinates cannot be determined:
	// Only default country without fake coordinates or city
	utils.JSON(w, http.StatusOK, map[string]any{
		"source":  "country-default",
		"country": "India",
	})
}

type GeocodeRequest struct {
	Lat any `json:"lat"`
	Lng any `json:"lng"`
}

type GeocodeAddress struct {
	Street           string             `json:"street"`
	AreaStreet       string             `json:"areaStreet"`
	Area             string             `json:"area"`
	City             string             `json:"city"`
	State            string             `json:"state"`
	Country          string             `json:"country"`
	PinCode          string             `json:"pinCode"`
	FormattedAddress string             `json:"formattedAddress"`
	Coordinates      map[string]float64 `json:"coordinates"`
	Provider         string             `json:"provider"`
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
		parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
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
		parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
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

	// 1. Try Mapbox if token configured
	mapboxToken := strings.TrimSpace(os.Getenv("MAPBOX_ACCESS_TOKEN"))
	if mapboxToken != "" {
		addr, err := reverseGeocodeMapbox(r.Context(), lat, lng, mapboxToken)
		if err == nil && addr != nil {
			addr.Country = normalizeCountry(addr.Country)
			addr.State = normalizeState(addr.State)
			if addr.State == "" && len(addr.PinCode) >= 2 {
				addr.State = getStateFromPinPrefix(addr.PinCode)
			}
			writeGeocodeResponse(w, addr)
			return
		}
		slog.Warn("Mapbox reverse geocode failed, falling back to Nominatim", "error", err)
	}

	// 2. OpenStreetMap Nominatim reverse geocode fallback (free, no token required)
	addr, err := reverseGeocodeNominatim(r.Context(), lat, lng)
	if err != nil {
		slog.Error("Nominatim reverse geocode failed", "error", err)
		utils.Error(w, http.StatusBadGateway, "Geocoding service unavailable. Please enter your address manually.")
		return
	}

	addr.Country = normalizeCountry(addr.Country)
	addr.State = normalizeState(addr.State)
	if addr.State == "" && len(addr.PinCode) >= 2 {
		addr.State = getStateFromPinPrefix(addr.PinCode)
	}

	writeGeocodeResponse(w, addr)
}

func reverseGeocodeNominatim(ctx context.Context, lat, lng float64) (*GeocodeAddress, error) {
	nominatimURL := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?format=json&lat=%s&lon=%s&accept-language=en&addressdetails=1",
		url.QueryEscape(strconv.FormatFloat(lat, 'f', 6, 64)),
		url.QueryEscape(strconv.FormatFloat(lng, 'f', 6, 64)))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, nominatimURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "JamaesCraftopia/1.0 (contact@jamaescraftopia.com)")
	req.Header.Set("Accept-Language", "en")

	client := &http.Client{Timeout: 6 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nominatim returned status %d", res.StatusCode)
	}

	var data struct {
		DisplayName string `json:"display_name"`
		Address     struct {
			Road          string `json:"road"`
			HouseNumber   string `json:"house_number"`
			Suburb        string `json:"suburb"`
			Neighbourhood string `json:"neighbourhood"`
			Quarter       string `json:"quarter"`
			Village       string `json:"village"`
			City          string `json:"city"`
			Town          string `json:"town"`
			Municipality  string `json:"municipality"`
			State         string `json:"state"`
			Country       string `json:"country"`
			Postcode      string `json:"postcode"`
		} `json:"address"`
	}

	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return nil, err
	}

	streetParts := make([]string, 0, 2)
	if data.Address.Road != "" {
		streetParts = append(streetParts, data.Address.Road)
	}
	if data.Address.HouseNumber != "" {
		streetParts = append(streetParts, data.Address.HouseNumber)
	}
	street := strings.Join(streetParts, ", ")

	area := data.Address.Suburb
	if area == "" {
		area = data.Address.Neighbourhood
	}
	if area == "" {
		area = data.Address.Quarter
	}
	if area == "" {
		area = data.Address.Village
	}
	if area == "" {
		area = street
	}

	city := data.Address.City
	if city == "" {
		city = data.Address.Town
	}
	if city == "" {
		city = data.Address.Municipality
	}
	if city == "" {
		city = data.Address.Village
	}

	country := data.Address.Country
	if country == "" {
		country = "India"
	}

	return &GeocodeAddress{
		Street:           street,
		AreaStreet:       street,
		Area:             area,
		City:             city,
		State:            data.Address.State,
		Country:          country,
		PinCode:          data.Address.Postcode,
		FormattedAddress: data.DisplayName,
		Coordinates:      map[string]float64{"lat": lat, "lng": lng},
		Provider:         "nominatim",
	}, nil
}

func reverseGeocodeMapbox(ctx context.Context, lat, lng float64, token string) (*GeocodeAddress, error) {
	mapboxURL := fmt.Sprintf("https://api.mapbox.com/geocoding/v5/mapbox.places/%f,%f.json?access_token=%s&types=address,place,locality,neighborhood,poi&language=en&country=in&limit=3",
		lng, lat, url.QueryEscape(token))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, mapboxURL, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mapbox returned status %d", res.StatusCode)
	}

	var data struct {
		Features []struct {
			PlaceName string `json:"place_name"`
			Text      string `json:"text"`
			Address   string `json:"address"`
			Context   []struct {
				ID   string `json:"id"`
				Text string `json:"text"`
			} `json:"context"`
		} `json:"features"`
	}

	if err := json.NewDecoder(res.Body).Decode(&data); err != nil || len(data.Features) == 0 {
		return nil, errors.New("no features returned from mapbox")
	}

	primary := data.Features[0]
	getContext := func(prefix string) string {
		for _, item := range primary.Context {
			if strings.HasPrefix(item.ID, prefix) {
				return item.Text
			}
		}
		return ""
	}

	street := primary.Address
	if street != "" && primary.Text != "" {
		street = street + " " + primary.Text
	} else if street == "" {
		street = primary.Text
	}

	city := getContext("place.")
	if city == "" {
		city = getContext("locality.")
	}
	state := getContext("region.")
	pinCode := getContext("postcode.")
	country := getContext("country.")
	if country == "" {
		country = "India"
	}
	area := getContext("neighborhood.")
	if area == "" {
		area = getContext("locality.")
	}

	return &GeocodeAddress{
		Street:           street,
		AreaStreet:       street,
		Area:             area,
		City:             city,
		State:            state,
		Country:          country,
		PinCode:          pinCode,
		FormattedAddress: primary.PlaceName,
		Coordinates:      map[string]float64{"lat": lat, "lng": lng},
		Provider:         "mapbox",
	}, nil
}
