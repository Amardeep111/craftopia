package handlers

import (
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type AuthHandler struct {
	userRepo    *repository.UserRepository
	sessionRepo *repository.SessionRepository
	cfg         *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, sessionRepo *repository.SessionRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		cfg:         cfg,
	}
}

type AuthRequest struct {
	Email             string  `json:"email"`
	Password          string  `json:"password,omitempty"`
	EncryptedPassword any     `json:"encryptedPassword,omitempty"`
	AdminOnly         bool    `json:"adminOnly,omitempty"`
	Name              *string `json:"name,omitempty"`
	Phone             *string `json:"phone,omitempty"`
	Mobile            *string `json:"mobile,omitempty"`
}

type LogoutRequest struct {
	Everywhere bool `json:"everywhere,omitempty"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		utils.Error(w, http.StatusBadRequest, "Valid email is required")
		return
	}

	password := req.Password
	if password == "" && req.EncryptedPassword != nil {
		decrypted, err := utils.DecryptRSAEnvelope(req.EncryptedPassword, h.cfg.PasswordEncryptionPrivateKey)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not securely process your password. Please try again.")
			return
		}
		password = decrypted
	}

	if len(password) < 6 {
		utils.Error(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	phone := req.Phone
	if phone == nil && req.Mobile != nil {
		phone = req.Mobile
	}

	existing, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		utils.Error(w, http.StatusConflict, "An account with this email already exists")
		return
	}

	user, err := h.userRepo.Create(r.Context(), req.Email, password, req.Name, phone)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to create user account")
		return
	}

	// Create stateful session in PostgreSQL
	session, err := h.sessionRepo.Create(r.Context(), user.ID, 7*24*time.Hour)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	encryptedCookie, err := utils.EncryptSessionCookie(session.Token, h.cfg.SessionCookieSecret)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure session cookie")
		return
	}

	isProd := h.cfg.Environment == "production"
	http.SetCookie(w, &http.Cookie{
		Name:     "jamaes_session",
		Value:    encryptedCookie,
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	})

	utils.Success(w, http.StatusCreated, "Account created successfully", map[string]any{
		"token": encryptedCookie,
		"user": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		utils.Error(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	password := req.Password
	if password == "" && req.EncryptedPassword != nil {
		decrypted, err := utils.DecryptRSAEnvelope(req.EncryptedPassword, h.cfg.PasswordEncryptionPrivateKey)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not securely process your password. Please try again.")
			return
		}
		password = decrypted
	}

	if password == "" {
		utils.Error(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !h.userRepo.VerifyPassword(user.Password, password) {
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !user.Active {
		utils.Error(w, http.StatusForbidden, "This account is inactive. Please contact support.")
		return
	}

	if req.AdminOnly && (user.Role != "ADMIN" && user.Role != "SUPERADMIN" || !user.AdminActive) {
		utils.Error(w, http.StatusForbidden, "This account does not have administrator access.")
		return
	}

	// Create stateful session in PostgreSQL
	session, err := h.sessionRepo.Create(r.Context(), user.ID, 7*24*time.Hour)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	encryptedCookie, err := utils.EncryptSessionCookie(session.Token, h.cfg.SessionCookieSecret)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure session cookie")
		return
	}

	isProd := h.cfg.Environment == "production"
	http.SetCookie(w, &http.Cookie{
		Name:     "jamaes_session",
		Value:    encryptedCookie,
		Path:     "/",
		MaxAge:   7 * 24 * 3600,
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	})

	utils.Success(w, http.StatusOK, "Logged in successfully", map[string]any{
		"token": encryptedCookie,
		"user": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	tokenStr := ""
	if cookie, err := r.Cookie("jamaes_session"); err == nil {
		tokenStr = cookie.Value
	} else if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	}

	if tokenStr != "" {
		rawToken := tokenStr
		if strings.HasPrefix(tokenStr, "enc.v1.") {
			if decrypted, err := utils.DecryptSessionCookie(tokenStr, h.cfg.SessionCookieSecret); err == nil {
				rawToken = decrypted
			}
		}

		if req.Everywhere {
			if _, user, err := h.sessionRepo.Verify(r.Context(), rawToken); err == nil && user != nil {
				_ = h.sessionRepo.InvalidateAll(r.Context(), user.ID)
			} else {
				_ = h.sessionRepo.Invalidate(r.Context(), rawToken)
			}
		} else {
			_ = h.sessionRepo.Invalidate(r.Context(), rawToken)
		}
	}

	isProd := h.cfg.Environment == "production"
	http.SetCookie(w, &http.Cookie{
		Name:     "jamaes_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	})

	msg := "Logged out."
	if req.Everywhere {
		msg = "Logged out of all devices."
	}
	utils.Success(w, http.StatusOK, msg, nil)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.userRepo.GetByEmail(r.Context(), claims.Email)
	if err != nil || user == nil {
		utils.Error(w, http.StatusNotFound, "User not found")
		return
	}

	utils.Success(w, http.StatusOK, "", map[string]any{
		"user": map[string]any{
			"id":               user.ID,
			"email":            user.Email,
			"name":             user.Name,
			"phone":            user.Phone,
			"role":             user.Role,
			"adminActive":      user.AdminActive,
			"adminPermissions": user.AdminPermissions,
			"active":           user.Active,
		},
	})
}

func (h *AuthHandler) PasswordKey(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store, max-age=0")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if h.cfg.PasswordEncryptionPrivateKey == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"available": false,
		})
		return
	}

	derBytes, err := base64.StdEncoding.DecodeString(h.cfg.PasswordEncryptionPrivateKey)
	if err != nil {
		utils.Error(w, http.StatusServiceUnavailable, "Secure password handling is temporarily unavailable.")
		return
	}

	privKeyInterface, err := x509.ParsePKCS8PrivateKey(derBytes)
	if err != nil {
		utils.Error(w, http.StatusServiceUnavailable, "Secure password handling is temporarily unavailable.")
		return
	}

	rsaPriv, ok := privKeyInterface.(*rsa.PrivateKey)
	if !ok {
		utils.Error(w, http.StatusServiceUnavailable, "Secure password handling is temporarily unavailable.")
		return
	}

	pubDer, err := x509.MarshalPKIXPublicKey(&rsaPriv.PublicKey)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to export public key")
		return
	}

	sha := sha256.Sum256(pubDer)
	kid := hex.EncodeToString(sha[:])[:24]

	nStr := base64.RawURLEncoding.EncodeToString(rsaPriv.PublicKey.N.Bytes())
	eBytes := big.NewInt(int64(rsaPriv.PublicKey.E)).Bytes()
	eStr := base64.RawURLEncoding.EncodeToString(eBytes)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"kid": kid,
		"publicKey": map[string]any{
			"kty": "RSA",
			"n":   nStr,
			"e":   eStr,
			"alg": "RSA-OAEP-256",
			"use": "enc",
		},
	})
}

// CheckUser handles POST /api/auth/check-user (legacy decommissioned endpoint)
func (h *AuthHandler) CheckUser(w http.ResponseWriter, r *http.Request) {
	utils.Error(w, http.StatusGone, "This endpoint is no longer available.")
}

type OTPRequestBody struct {
	EmailOrMobile string `json:"emailOrMobile"`
	ChallengeID   string `json:"challengeId"`
}

// RequestOTP handles POST /api/auth/otp
func (h *AuthHandler) RequestOTP(w http.ResponseWriter, r *http.Request) {
	var body OTPRequestBody
	_ = json.NewDecoder(r.Body).Decode(&body)

	if body.ChallengeID != "" {
		utils.Error(w, http.StatusNotImplemented, "Email verification codes are not configured. Please sign in with your password.")
		return
	}

	trimmed := strings.TrimSpace(body.EmailOrMobile)
	if trimmed == "" {
		utils.Error(w, http.StatusBadRequest, "Please enter a valid email or mobile number")
		return
	}

	// Verify user exists in database
	user, err := h.userRepo.FindByEmail(r.Context(), trimmed)
	if err != nil || user == nil {
		utils.Error(w, http.StatusNotFound, "No account found with this email or mobile. Please sign up first.")
		return
	}

	// Structured notice matching production Next.js parity
	utils.Error(w, http.StatusNotImplemented, "One-time-code sign-in is not available yet. Please use password sign-in.")
}

type VerifyOTPRequest struct {
	ChallengeID string `json:"challengeId"`
	OTP         string `json:"otp"`
}

// VerifyOTP handles POST /api/auth/verify
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ChallengeID == "" || len(req.OTP) != 6 {
		utils.Error(w, http.StatusBadRequest, "Enter the six-digit email verification code.")
		return
	}

	utils.Error(w, http.StatusGone, "Email verification is not enabled. Please use password sign-in.")
}

type PasswordChangeRequest struct {
	CurrentPassword any `json:"currentPassword"`
	NewPassword     any `json:"newPassword"`
}

// ChangePassword handles POST /api/account/password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil {
		utils.Error(w, http.StatusUnauthorized, "Please sign in again to change your password.")
		return
	}

	var req PasswordChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid password change payload.")
		return
	}

	user, err := h.userRepo.FindByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		utils.Error(w, http.StatusNotFound, "Account not found.")
		return
	}

	currentPlain, err := h.decryptPassword(req.CurrentPassword)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Could not securely process the current password.")
		return
	}
	if err := utils.CheckPassword(user.Password, currentPlain); err != nil {
		utils.Error(w, http.StatusBadRequest, "Current password is incorrect.")
		return
	}

	newPlain, err := h.decryptPassword(req.NewPassword)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, "Could not securely process the new password.")
		return
	}
	if len(newPlain) < 8 {
		utils.Error(w, http.StatusBadRequest, "Password must be at least 8 characters long.")
		return
	}

	hashed, err := utils.HashPassword(newPlain)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure new password.")
		return
	}

	if err := h.userRepo.UpdatePassword(r.Context(), user.ID, hashed); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not update password.")
		return
	}

	utils.Success(w, http.StatusOK, "Password updated successfully.", nil)
}

func (h *AuthHandler) decryptPassword(payload any) (string, error) {
	return utils.DecryptRSAEnvelope(payload, h.cfg.PasswordEncryptionPrivateKey)
}

// VerifyChangePassword handles POST /api/account/password/verify
func (h *AuthHandler) VerifyChangePassword(w http.ResponseWriter, r *http.Request) {
	var req VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.OTP) != 6 {
		utils.Error(w, http.StatusBadRequest, "Enter the six-digit verification code.")
		return
	}

	utils.Error(w, http.StatusGone, "Password verification codes are not enabled. The password is updated after current-password confirmation.")
}
