package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
)

var validAdminPermissions = map[string]bool{
	"dashboard.view": true,
	"orders.view":    true, "orders.manage": true,
	"customRequests.view": true, "customRequests.manage": true,
	"products.view": true, "products.manage": true,
	"users.view": true, "users.manage": true,
	"coupons.view": true, "coupons.manage": true,
	"categories.view": true, "categories.manage": true,
	"settings.view": true, "settings.manage": true,
}

type AdminAccessHandler struct {
	users    *repository.UserRepository
	sessions *repository.SessionRepository
	cfg      *config.Config
}

func NewAdminAccessHandler(users *repository.UserRepository, sessions *repository.SessionRepository, cfg *config.Config) *AdminAccessHandler {
	return &AdminAccessHandler{users: users, sessions: sessions, cfg: cfg}
}

func (h *AdminAccessHandler) requireSuperadmin(w http.ResponseWriter, r *http.Request) bool {
	claims, err := middleware.GetUserFromContext(r.Context())
	if err != nil || claims == nil || claims.Role != "SUPERADMIN" {
		utils.Error(w, http.StatusForbidden, "Superadmin privileges required")
		return false
	}
	return true
}

func (h *AdminAccessHandler) List(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperadmin(w, r) {
		return
	}
	admins, err := h.users.ListAdmins(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Failed to load admin accounts")
		return
	}
	utils.JSON(w, http.StatusOK, admins)
}

type adminAccessPayload struct {
	UserID            string   `json:"userId"`
	Name              string   `json:"name"`
	Email             string   `json:"email"`
	Active            bool     `json:"active"`
	Permissions       []string `json:"permissions"`
	EncryptedPassword any      `json:"encryptedPassword"`
}

func (h *AdminAccessHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperadmin(w, r) {
		return
	}
	var req adminAccessPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, "Invalid administrator payload")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if req.Email == "" || !validAdminPermissionSet(req.Permissions) {
		utils.Error(w, http.StatusBadRequest, "A valid email and permission list are required")
		return
	}
	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not look up the account")
		return
	}
	if user != nil && user.Role == "SUPERADMIN" {
		utils.Error(w, http.StatusConflict, "Superadmin access cannot be changed here")
		return
	}
	if user == nil {
		password, err := utils.DecryptRSAEnvelope(req.EncryptedPassword, h.cfg.PasswordEncryptionPrivateKey)
		if err != nil || len(password) < 8 {
			utils.Error(w, http.StatusBadRequest, "A secure initial password of at least 8 characters is required for a new account")
			return
		}
		name := req.Name
		user, err = h.users.Create(r.Context(), req.Email, password, &name, nil)
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, "Could not create the administrator account")
			return
		}
	}
	if err := h.users.SetAdminAccess(r.Context(), user.ID, req.Name, true, req.Permissions); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not grant administrator access")
		return
	}
	_ = h.sessions.InvalidateAll(r.Context(), user.ID)
	updated, err := h.users.FindByID(r.Context(), user.ID)
	if err != nil || updated == nil {
		utils.Error(w, http.StatusInternalServerError, "Administrator was saved but could not be reloaded")
		return
	}
	utils.Success(w, http.StatusOK, "Administrator access granted", updated)
}

func (h *AdminAccessHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperadmin(w, r) {
		return
	}
	var req adminAccessPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" || !validAdminPermissionSet(req.Permissions) {
		utils.Error(w, http.StatusBadRequest, "User ID and a valid permission list are required")
		return
	}
	user, err := h.users.FindByID(r.Context(), req.UserID)
	if err != nil || user == nil || user.Role != "ADMIN" {
		utils.Error(w, http.StatusNotFound, "Administrator not found")
		return
	}
	if err := h.users.SetAdminAccess(r.Context(), user.ID, strings.TrimSpace(req.Name), req.Active, req.Permissions); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not update administrator access")
		return
	}
	_ = h.sessions.InvalidateAll(r.Context(), user.ID)
	utils.Success(w, http.StatusOK, "Administrator access updated", nil)
}

func (h *AdminAccessHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperadmin(w, r) {
		return
	}
	var req struct {
		UserID string `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		utils.Error(w, http.StatusBadRequest, "User ID is required")
		return
	}
	user, err := h.users.FindByID(r.Context(), req.UserID)
	if err != nil || user == nil || user.Role != "ADMIN" {
		utils.Error(w, http.StatusNotFound, "Administrator not found")
		return
	}
	if err := h.users.RemoveAdminAccess(r.Context(), user.ID); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not remove administrator access")
		return
	}
	_ = h.sessions.InvalidateAll(r.Context(), user.ID)
	utils.Success(w, http.StatusOK, "Administrator access removed", nil)
}

func (h *AdminAccessHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperadmin(w, r) {
		return
	}
	var req struct {
		UserID            string `json:"userId"`
		EncryptedPassword any    `json:"encryptedPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		utils.Error(w, http.StatusBadRequest, "User ID and new password are required")
		return
	}
	user, err := h.users.FindByID(r.Context(), req.UserID)
	if err != nil || user == nil || user.Role != "ADMIN" {
		utils.Error(w, http.StatusNotFound, "Administrator not found")
		return
	}
	password, err := utils.DecryptRSAEnvelope(req.EncryptedPassword, h.cfg.PasswordEncryptionPrivateKey)
	if err != nil || len(password) < 8 {
		utils.Error(w, http.StatusBadRequest, "A secure password of at least 8 characters is required")
		return
	}
	hashed, err := utils.HashPassword(password)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not secure the password")
		return
	}
	if err := h.users.UpdatePassword(r.Context(), user.ID, hashed); err != nil {
		utils.Error(w, http.StatusInternalServerError, "Could not reset administrator password")
		return
	}
	_ = h.sessions.InvalidateAll(r.Context(), user.ID)
	utils.Success(w, http.StatusOK, "Administrator password reset. Their sessions were signed out.", nil)
}

func validAdminPermissionSet(permissions []string) bool {
	for _, permission := range permissions {
		if !validAdminPermissions[permission] {
			return false
		}
	}
	return true
}
