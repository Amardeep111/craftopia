package handler

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
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
	// 1. Check deterministic __path rewrite query parameter from vercel.json
	q := r.URL.Query()
	if originalPath := q.Get("__path"); originalPath != "" {
		cleanPath := "/" + strings.TrimPrefix(originalPath, "/")
		r.URL.Path = cleanPath
		q.Del("__path")
		r.URL.RawQuery = q.Encode()
	} else if forwardURI := r.Header.Get("x-forwarded-uri"); forwardURI != "" {
		if parsed, err := url.Parse(forwardURI); err == nil && parsed.Path != "" {
			r.URL.Path = parsed.Path
		}
	}

	appInstance := getApp()

	if appInstance == nil || appInstance.Handler == nil {
		http.Error(w, "Service Unavailable: Failed to initialize backend application", http.StatusServiceUnavailable)
		return
	}

	appInstance.Handler.ServeHTTP(w, r)
}
