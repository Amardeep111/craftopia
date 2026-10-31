package handler

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"os"
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
		// Return app without DB so health endpoints and fallbacks still function
		return app.Setup(cfg, nil)
	}

	application = app.Setup(cfg, db)
	return application
}

// Handler is the Vercel Serverless Function entrypoint.
// Vercel routes all requests matching vercel.json rewrites to this function.
func Handler(w http.ResponseWriter, r *http.Request) {
	// When Vercel rewrites routes to /api/index, it supplies the original incoming path
	// in the x-matched-path or x-forwarded-uri header.
	// We restore r.URL.Path so Go 1.22's http.ServeMux matches the intended route pattern.
	matchedPath := r.Header.Get("x-matched-path")
	if matchedPath == "" {
		matchedPath = r.Header.Get("X-Matched-Path")
	}
	if matchedPath == "" {
		matchedPath = r.Header.Get("x-forwarded-uri")
	}

	if matchedPath != "" {
		if parsed, err := url.Parse(matchedPath); err == nil && parsed.Path != "" {
			r.URL.Path = parsed.Path
			r.URL.RawPath = parsed.RawPath
			if parsed.RawQuery != "" && r.URL.RawQuery == "" {
				r.URL.RawQuery = parsed.RawQuery
			}
		} else {
			r.URL.Path = matchedPath
		}
	}

	appInstance := getApp()

	if appInstance == nil || appInstance.Handler == nil {
		http.Error(w, "Service Unavailable: Failed to initialize backend application", http.StatusServiceUnavailable)
		return
	}

	appInstance.Handler.ServeHTTP(w, r)
}
