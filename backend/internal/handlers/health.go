package handlers

import (
	"context"
	"net/http"
	"time"

	"craftopia-backend/internal/database"
	"craftopia-backend/internal/utils"
)

type HealthHandler struct {
	db *database.DB
}

func NewHealthHandler(db *database.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Liveness probe (checks if serverless function/container is up)
func (h *HealthHandler) Liveness(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusOK, map[string]any{
		"status":    "UP",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Readiness probe (checks if database pool is alive & accepting queries)
func (h *HealthHandler) Readiness(w http.ResponseWriter, r *http.Request) {
	if h.db == nil || h.db.Pool == nil {
		utils.JSON(w, http.StatusOK, map[string]any{
			"status":    "DEGRADED",
			"database":  "DISCONNECTED",
			"message":   "Database pool is uninitialized. Please check that DATABASE_URL is set in Vercel environment variables.",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	if err := h.db.Pool.Ping(ctx); err != nil {
		utils.JSON(w, http.StatusOK, map[string]any{
			"status":    "DOWN",
			"database":  "UNREACHABLE",
			"error":     err.Error(),
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]any{
		"status":   "READY",
		"database": "CONNECTED",
		"pool": map[string]any{
			"total_conns": h.db.Pool.Stat().TotalConns(),
			"idle_conns":  h.db.Pool.Stat().IdleConns(),
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
