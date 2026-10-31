package handler

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"craftopia-backend/internal/app"
	"craftopia-backend/internal/config"
	"craftopia-backend/internal/database"
)

var (
	mu          sync.RWMutex
	application *app.App
)

func getApp() *app.App {
	mu.RLock()
	if application != nil && application.DB != nil {
		defer mu.RUnlock()
		return application
	}
	mu.RUnlock()

	mu.Lock()
	defer mu.Unlock()

	if application != nil && application.DB != nil {
		return application
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg)
	if err != nil {
		slog.Error("Vercel Serverless: Database connection failed", "error", err)
		return app.Setup(cfg, nil)
	}

	application = app.Setup(cfg, db)
	return application
}

// Handler is the Vercel Serverless Function entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	// Extract the actual request path forwarded by vercel.json rewrite (?path=:path*)
	q := r.URL.Query()
	rawPath := q.Get("path")
	if rawPath == "" {
		rawPath = q.Get("__path")
	}

	if rawPath != "" {
		clean := "/" + strings.TrimPrefix(rawPath, "/")
		r.URL.Path = clean
		q.Del("path")
		q.Del("__path")
		r.URL.RawQuery = q.Encode()
	} else if r.URL.Path == "/api/index" || r.URL.Path == "/api" {
		r.URL.Path = "/"
	}

	appInstance := getApp()

	if appInstance == nil || appInstance.Handler == nil {
		http.Error(w, "Service Unavailable: Failed to initialize backend application", http.StatusServiceUnavailable)
		return
	}

	appInstance.Handler.ServeHTTP(w, r)
}
