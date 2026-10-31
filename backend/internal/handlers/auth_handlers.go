package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
	cfg      *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, cfg: cfg}
}

type AuthRequest struct {
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Name     *string `json:"name,omitempty"`
	Phone    *string `json:"phone,omitempty"`
}

func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Email == "" || len(req.Password) < 6 {
		utils.Error(w, http.StatusBadRequest, "Valid email and a password of at least 6 characters are required")
		return
	}

	existing, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		utils.Error(w, http.StatusConflict, "An account with this email already exists")
		return
	}

	user, err := h.userRepo.Create(r.Context(), req.Email, req.Password, req.Name, req.Phone)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to create user account")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, 7*24*time.Hour)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to generate session token")
		return
	}

	utils.Success(w, http.StatusCreated, "Account created successfully", map[string]any{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !h.userRepo.VerifyPassword(user.Password, req.Password) {
		utils.Error(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg.JWTSecret, 7*24*time.Hour)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to generate session token")
		return
	}

	utils.Success(w, http.StatusOK, "Logged in successfully", map[string]any{
		"token": token,
		"user":  user,
	})
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

	utils.JSON(w, http.StatusOK, user)
}

