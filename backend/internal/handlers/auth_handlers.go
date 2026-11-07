package handlers

import (
	"crypto/hmac"
	crand "crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/email"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/models"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo    *repository.UserRepository
	sessionRepo *repository.SessionRepository
	cfg         *config.Config
	mailer      *email.Mailer
}

const (
	customerSessionDuration = 7 * 24 * time.Hour
	adminSessionDuration    = time.Hour
	adminSessionRenewWindow = 15 * time.Minute
)

func NewAuthHandler(userRepo *repository.UserRepository, sessionRepo *repository.SessionRepository, cfg *config.Config, mailer *email.Mailer) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		cfg:         cfg,
		mailer:      mailer,
	}
}

type AuthRequest struct {
	Email                    string  `json:"email"`
	Password                 string  `json:"password,omitempty"`
	ConfirmPassword          string  `json:"confirmPassword,omitempty"`
	EncryptedPassword        any     `json:"encryptedPassword,omitempty"`
	EncryptedConfirmPassword any     `json:"encryptedConfirmPassword,omitempty"`
	AdminOnly                bool    `json:"adminOnly,omitempty"`
	Name                     *string `json:"name,omitempty"`
	Phone                    *string `json:"phone,omitempty"`
	Mobile                   *string `json:"mobile,omitempty"`
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
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		utils.Error(w, http.StatusBadRequest, "Please enter a valid email address")
		return
	}

	if utils.IsDisposableEmail(req.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}

	if req.Name == nil || strings.TrimSpace(*req.Name) == "" || len(strings.TrimSpace(*req.Name)) < 2 {
		utils.Error(w, http.StatusBadRequest, "Please enter your full name.")
		return
	}
	trimmedName := strings.TrimSpace(*req.Name)
	req.Name = &trimmedName

	phone := req.Phone
	if phone == nil && req.Mobile != nil {
		phone = req.Mobile
	}
	if phone == nil || strings.TrimSpace(*phone) == "" {
		utils.Error(w, http.StatusBadRequest, "Please enter your mobile number.")
		return
	}
	trimmedPhone := strings.TrimSpace(*phone)
	phone = &trimmedPhone

	password := req.Password
	if password == "" && req.EncryptedPassword != nil {
		decrypted, err := utils.DecryptRSAEnvelope(req.EncryptedPassword, h.cfg.PasswordEncryptionPrivateKey)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not securely process your password. Please try again.")
			return
		}
		password = decrypted
	}

	confirmPassword := req.ConfirmPassword
	if confirmPassword == "" && req.EncryptedConfirmPassword != nil {
		decrypted, err := utils.DecryptRSAEnvelope(req.EncryptedConfirmPassword, h.cfg.PasswordEncryptionPrivateKey)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, "Could not securely process your confirm password. Please try again.")
			return
		}
		confirmPassword = decrypted
	}

	if len(password) < 8 {
		utils.Error(w, http.StatusBadRequest, "Password must be at least 8 characters long.")
		return
	}

	if (req.ConfirmPassword != "" || req.EncryptedConfirmPassword != nil) && password != confirmPassword {
		utils.Error(w, http.StatusBadRequest, "Passwords do not match.")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Failed to hash password during signup", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to secure password")
		return
	}

	existing, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		slog.Error("Signup user lookup failed", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Unable to create account right now. Please try again.")
		return
	}

	var userID string
	if existing != nil {
		if existing.EmailVerified {
			utils.Error(w, http.StatusConflict, "An account with this email already exists")
			return
		}
		// Existing unverified user: update their details
		userID = existing.ID
		_ = h.userRepo.UpdateUserSignupDetails(r.Context(), existing.ID, string(hashedPassword), req.Name, phone)
	} else {
		// Create new user with emailVerified = false
		user, err := h.userRepo.Create(r.Context(), req.Email, password, req.Name, phone)
		if err != nil {
			slog.Error("Signup user creation failed", "error", err)
			utils.Error(w, http.StatusInternalServerError, "Failed to create user account")
			return
		}
		userID = user.ID
	}

	code := generateOTP()
	codeHash := h.hashEmailOTP(req.Email, code)
	payloadMap := map[string]any{
		"userId":  userID,
		"purpose": "signup",
	}
	expiresAt := time.Now().Add(10 * time.Minute)

	challenge, err := h.userRepo.CreateEmailVerification(r.Context(), req.Email, codeHash, payloadMap, expiresAt)
	if err != nil {
		slog.Error("Failed to create email verification challenge", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to start signup verification")
		return
	}

	if err := h.mailer.SendSignupVerification(req.Email, code); err != nil {
		slog.Error("Failed to send signup verification email", "email", req.Email, "error", err)
	}

	utils.Success(w, http.StatusCreated, "Verification code sent.", map[string]any{
		"challengeId": challenge.ID,
		"email":       req.Email,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		utils.Error(w, http.StatusBadRequest, "Please enter a valid email address")
		return
	}

	if utils.IsDisposableEmail(req.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
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
	if err != nil {
		slog.Error("Login user lookup failed", "error", err)
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if user == nil {
		slog.Warn("Login rejected", "reason", "user not found")
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !h.userRepo.VerifyPassword(user.Password, password) {
		slog.Warn("Login rejected", "reason", "password mismatch")
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !user.Active {
		utils.Error(w, http.StatusForbidden, "This account is inactive. Please contact support.")
		return
	}

	// Email verification gate
	if !user.EmailVerified {
		code := generateOTP()
		codeHash := h.hashEmailOTP(user.Email, code)
		payloadMap := map[string]any{
			"userId":  user.ID,
			"purpose": "login-verify",
		}
		expiresAt := time.Now().Add(10 * time.Minute)

		challenge, _ := h.userRepo.CreateEmailVerification(r.Context(), user.Email, codeHash, payloadMap, expiresAt)
		if challenge != nil {
			h.mailer.SendEmailBestEffort("login-unverified-otp", func() error {
				return h.mailer.SendSignupVerification(user.Email, code)
			})
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusForbidden)
		challengeID := ""
		if challenge != nil {
			challengeID = challenge.ID
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success":       false,
			"emailVerified": false,
			"challengeId":   challengeID,
			"email":         user.Email,
			"error":         "Your email is not verified yet. Please verify your email to continue.",
		})
		return
	}

	if req.AdminOnly && (user.Role != "ADMIN" && user.Role != "SUPERADMIN" || !user.AdminActive) {
		utils.Error(w, http.StatusForbidden, "This account does not have administrator access.")
		return
	}

	// Administrators get a one-hour inactivity timeout; customer sessions retain
	// their existing seven-day duration.
	sessionDuration := customerSessionDuration
	if user.Role == "ADMIN" || user.Role == "SUPERADMIN" {
		sessionDuration = adminSessionDuration
	}
	session, err := h.sessionRepo.Create(r.Context(), user.ID, sessionDuration)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	encryptedCookie, err := utils.EncryptSessionCookie(session.Token, h.cfg.SessionCookieSecret)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure session cookie")
		return
	}

	h.setSessionCookie(w, encryptedCookie, sessionDuration)

	utils.Success(w, http.StatusOK, "Logged in successfully", map[string]any{
		"token": encryptedCookie,
		"user": map[string]any{
			"id":            user.ID,
			"email":         user.Email,
			"name":          user.Name,
			"role":          user.Role,
			"emailVerified": user.EmailVerified,
		},
	})
}

func (h *AuthHandler) setSessionCookie(w http.ResponseWriter, value string, duration time.Duration) {
	http.SetCookie(w, &http.Cookie{
		Name:     "jamaes_session",
		Value:    value,
		Path:     "/",
		MaxAge:   int(duration.Seconds()),
		Expires:  time.Now().Add(duration),
		HttpOnly: true,
		Secure:   h.cfg.Environment == "production",
		SameSite: http.SameSiteLaxMode,
	})
}

// Heartbeat extends an authenticated admin session while the admin is active.
func (h *AuthHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil || (claims.Role != "ADMIN" && claims.Role != "SUPERADMIN") {
		utils.Error(w, http.StatusForbidden, "Administrator access required")
		return
	}
	rawToken := middleware.GetRawSessionTokenFromContext(r.Context())
	cookie, cookieErr := r.Cookie("jamaes_session")
	if rawToken == "" || cookieErr != nil {
		utils.Error(w, http.StatusUnauthorized, "An active admin session is required")
		return
	}

	expiresAt, err := h.sessionRepo.ExtendAdminSession(r.Context(), rawToken, adminSessionDuration, adminSessionRenewWindow)
	if err != nil {
		if errors.Is(err, repository.ErrInactiveAdminSession) {
			utils.Error(w, http.StatusUnauthorized, "Admin session expired. Sign in again.")
			return
		}
		slog.Error("Failed to extend admin session", "user_id", claims.UserID, "error", err)
		utils.Error(w, http.StatusInternalServerError, "Could not extend admin session")
		return
	}

	h.setSessionCookie(w, cookie.Value, time.Until(expiresAt))
	utils.Success(w, http.StatusOK, "Admin session extended", map[string]time.Time{"expiresAt": expiresAt})
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
		challenge, err := h.userRepo.GetEmailVerification(r.Context(), body.ChallengeID)
		if err != nil || challenge == nil || challenge.ConsumedAt != nil || challenge.ExpiresAt.Before(time.Now()) {
			utils.Error(w, http.StatusGone, "This signup has expired. Please start again.")
			return
		}

		if utils.IsDisposableEmail(challenge.Email) {
			utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
			return
		}

		if challenge.Resends >= 3 {
			utils.Error(w, http.StatusTooManyRequests, "You have reached the resend limit. Please start signup again.")
			return
		}

		if time.Since(challenge.UpdatedAt) < 30*time.Second {
			utils.Error(w, http.StatusTooManyRequests, "Please wait before requesting another code.")
			return
		}

		newCode := generateOTP()
		newHash := h.hashEmailOTP(challenge.Email, newCode)
		newExpiresAt := time.Now().Add(10 * time.Minute)

		if err := h.userRepo.UpdateEmailVerificationCode(r.Context(), challenge.ID, newHash, newExpiresAt); err != nil {
			slog.Error("Failed to update email verification code", "error", err)
			utils.Error(w, http.StatusInternalServerError, "Could not resend the code.")
			return
		}

		if err := h.mailer.SendSignupVerification(challenge.Email, newCode); err != nil {
			slog.Error("Failed to resend verification email", "email", challenge.Email, "error", err)
		}

		utils.Success(w, http.StatusOK, "Verification code resent.", nil)
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ChallengeID == "" || len(strings.TrimSpace(req.OTP)) != 6 {
		utils.Error(w, http.StatusBadRequest, "Enter the six-digit email verification code.")
		return
	}

	code := strings.TrimSpace(req.OTP)
	challenge, err := h.userRepo.GetEmailVerification(r.Context(), req.ChallengeID)
	if err != nil || challenge == nil || challenge.ConsumedAt != nil || challenge.ExpiresAt.Before(time.Now()) {
		utils.Error(w, http.StatusGone, "This verification code expired. Start signup again.")
		return
	}

	if utils.IsDisposableEmail(challenge.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}

	if challenge.Attempts >= 5 {
		utils.Error(w, http.StatusTooManyRequests, "Too many attempts. Start signup again.")
		return
	}

	expectedHash := challenge.CodeHash
	actualHash := h.hashEmailOTP(challenge.Email, code)
	if !hmac.Equal([]byte(expectedHash), []byte(actualHash)) {
		_ = h.userRepo.IncrementEmailVerificationAttempts(r.Context(), challenge.ID)
		utils.Error(w, http.StatusBadRequest, "Incorrect verification code. Please try again.")
		return
	}

	var payload struct {
		UserID       string  `json:"userId"`
		Purpose      string  `json:"purpose"`
		Name         *string `json:"name"`
		Mobile       *string `json:"mobile"`
		PasswordHash string  `json:"passwordHash"`
	}
	if err := json.Unmarshal(challenge.Payload, &payload); err != nil {
		slog.Error("Invalid email verification payload", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to read verification data. Please try again.")
		return
	}

	if err := h.userRepo.ConsumeEmailVerification(r.Context(), challenge.ID); err != nil {
		utils.Error(w, http.StatusConflict, "This verification code has already been used.")
		return
	}

	var user *models.User
	if payload.UserID != "" {
		user, _ = h.userRepo.FindByID(r.Context(), payload.UserID)
	}
	if user == nil {
		user, _ = h.userRepo.GetByEmail(r.Context(), challenge.Email)
	}

	if user == nil {
		if payload.PasswordHash != "" {
			createdUser, err := h.userRepo.CreateWithHashedPassword(r.Context(), challenge.Email, payload.PasswordHash, payload.Name, payload.Mobile, true)
			if err != nil {
				slog.Error("User creation after verify failed", "error", err)
				utils.Error(w, http.StatusInternalServerError, "Failed to complete account registration")
				return
			}
			user = createdUser
		} else {
			utils.Error(w, http.StatusNotFound, "User account not found. Please sign up again.")
			return
		}
	}

	if err := h.userRepo.SetEmailVerified(r.Context(), user.ID, true); err != nil {
		slog.Error("Failed to update emailVerified flag", "user_id", user.ID, "error", err)
	}
	user.EmailVerified = true

	sessionDuration := customerSessionDuration
	if user.Role == "ADMIN" || user.Role == "SUPERADMIN" {
		sessionDuration = adminSessionDuration
	}

	session, err := h.sessionRepo.Create(r.Context(), user.ID, sessionDuration)
	if err != nil {
		slog.Error("Verification session creation failed", "user_id", user.ID, "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	encryptedCookie, err := utils.EncryptSessionCookie(session.Token, h.cfg.SessionCookieSecret)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure session cookie")
		return
	}

	h.setSessionCookie(w, encryptedCookie, sessionDuration)

	utils.Success(w, http.StatusOK, "Account verified successfully", map[string]any{
		"token": encryptedCookie,
		"user": map[string]any{
			"id":            user.ID,
			"email":         user.Email,
			"name":          user.Name,
			"role":          user.Role,
			"emailVerified": user.EmailVerified,
		},
	})
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword handles POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		utils.Error(w, http.StatusBadRequest, "Please enter a valid email address")
		return
	}

	if utils.IsDisposableEmail(req.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}

	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		slog.Error("Forgot password user lookup error", "email", req.Email, "error", err)
		utils.Error(w, http.StatusInternalServerError, "Unable to process request right now")
		return
	}

	// Security: don't reveal whether user exists
	if user == nil {
		utils.Success(w, http.StatusOK, "If an account exists with this email, a verification code has been sent.", nil)
		return
	}

	code := generateOTP()
	codeHash := h.hashEmailOTP(user.Email, code)
	payloadMap := map[string]any{
		"purpose": "forgot-password",
		"userId":  user.ID,
	}
	expiresAt := time.Now().Add(10 * time.Minute)

	challenge, err := h.userRepo.CreateEmailVerification(r.Context(), user.Email, codeHash, payloadMap, expiresAt)
	if err != nil {
		slog.Error("Failed to create forgot password verification", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to start password reset")
		return
	}

	if err := h.mailer.SendPasswordReset(user.Email, code); err != nil {
		slog.Error("Failed to send password reset email", "email", user.Email, "error", err)
	}

	utils.Success(w, http.StatusOK, "A reset code has been sent to your email.", map[string]any{
		"challengeId": challenge.ID,
		"email":       user.Email,
	})
}

type ResetPasswordRequest struct {
	ChallengeID       string `json:"challengeId"`
	OTP               string `json:"otp"`
	Password          string `json:"password,omitempty"`
	EncryptedPassword any    `json:"encryptedPassword,omitempty"`
}

// ResetPassword handles POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ChallengeID == "" || len(strings.TrimSpace(req.OTP)) != 6 {
		utils.Error(w, http.StatusBadRequest, "Enter the six-digit verification code.")
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

	if len(password) < 8 {
		utils.Error(w, http.StatusBadRequest, "Password must be at least 8 characters long.")
		return
	}

	code := strings.TrimSpace(req.OTP)
	challenge, err := h.userRepo.GetEmailVerification(r.Context(), req.ChallengeID)
	if err != nil || challenge == nil || challenge.ConsumedAt != nil || challenge.ExpiresAt.Before(time.Now()) {
		utils.Error(w, http.StatusGone, "This reset code has expired. Please request a new one.")
		return
	}

	if utils.IsDisposableEmail(challenge.Email) {
		utils.Error(w, http.StatusBadRequest, "Temporary or disposable email addresses are not permitted. Please use a valid personal or work email.")
		return
	}

	if challenge.Attempts >= 5 {
		utils.Error(w, http.StatusTooManyRequests, "Too many failed attempts. Please start again.")
		return
	}

	expectedHash := challenge.CodeHash
	actualHash := h.hashEmailOTP(challenge.Email, code)
	if !hmac.Equal([]byte(expectedHash), []byte(actualHash)) {
		_ = h.userRepo.IncrementEmailVerificationAttempts(r.Context(), challenge.ID)
		utils.Error(w, http.StatusBadRequest, "Incorrect verification code. Please try again.")
		return
	}

	var payload struct {
		Purpose string `json:"purpose"`
		UserID  string `json:"userId"`
	}
	if err := json.Unmarshal(challenge.Payload, &payload); err != nil || payload.Purpose != "forgot-password" || payload.UserID == "" {
		utils.Error(w, http.StatusBadRequest, "Invalid verification token")
		return
	}

	user, err := h.userRepo.FindByID(r.Context(), payload.UserID)
	if err != nil || user == nil {
		utils.Error(w, http.StatusNotFound, "Account not found")
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to secure new password")
		return
	}

	if err := h.userRepo.UpdatePassword(r.Context(), user.ID, string(hashed)); err != nil {
		slog.Error("Failed to update password", "error", err)
		utils.Error(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	// Invalidate all active sessions for security
	_ = h.sessionRepo.InvalidateAll(r.Context(), user.ID)
	_ = h.userRepo.ConsumeEmailVerification(r.Context(), challenge.ID)

	name := ""
	if user.Name != nil {
		name = *user.Name
	}
	h.mailer.SendEmailBestEffort("password-changed", func() error {
		return h.mailer.SendPasswordChanged(user.Email, name)
	})

	utils.Success(w, http.StatusOK, "Password updated successfully. Please sign in with your new password.", nil)
}

func (h *AuthHandler) hashEmailOTP(email, code string) string {
	secret := h.cfg.SessionCookieSecret
	if secret == "" {
		secret = h.cfg.JWTSecret
	}
	if secret == "" {
		secret = "craftopia-default-email-otp-secret"
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s:%s", strings.ToLower(strings.TrimSpace(email)), strings.TrimSpace(code))))
	return hex.EncodeToString(mac.Sum(nil))
}

func generateOTP() string {
	var b [4]byte
	_, _ = crand.Read(b[:])
	val := binary.BigEndian.Uint32(b[:]) % 1000000
	return fmt.Sprintf("%06d", val)
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
