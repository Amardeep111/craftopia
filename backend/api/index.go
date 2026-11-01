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
	// 1. If RequestURI is present and not the internal function path, parse it to extract the original path & query
	if r.RequestURI != "" && r.RequestURI != "/api/index" && r.RequestURI != "/api/index.go" && r.RequestURI != "/api" {
		if parsed, err := url.ParseRequestURI(r.RequestURI); err == nil && parsed.Path != "" {
			r.URL.Path = parsed.Path
			if parsed.RawQuery != "" {
				r.URL.RawQuery = parsed.RawQuery
			}
		}
	}

	// 2. Check proxy forwarding headers (x-forwarded-uri)
	if (r.URL.Path == "/api/index" || r.URL.Path == "/api/index.go" || r.URL.Path == "/api") && r.Header.Get("x-forwarded-uri") != "" {
		if parsed, err := url.ParseRequestURI(r.Header.Get("x-forwarded-uri")); err == nil && parsed.Path != "" {
			r.URL.Path = parsed.Path
			if parsed.RawQuery != "" && r.URL.RawQuery == "" {
				r.URL.RawQuery = parsed.RawQuery
			}
		}
	}

	// 3. Check query parameter overrides (?__path= or ?path=)
	q := r.URL.Query()
	if rawPath := q.Get("__path"); rawPath != "" {
		r.URL.Path = "/" + strings.TrimPrefix(rawPath, "/")
		q.Del("__path")
		r.URL.RawQuery = q.Encode()
	} else if rawPath := q.Get("path"); rawPath != "" && rawPath != "api/index" && rawPath != "/api/index" {
		r.URL.Path = "/" + strings.TrimPrefix(rawPath, "/")
		q.Del("path")
		r.URL.RawQuery = q.Encode()
	}

	// 4. Fallback: if path is still /api/index, /api/index.go, or /api, treat as root health check
	if r.URL.Path == "/api/index" || r.URL.Path == "/api/index.go" || r.URL.Path == "/api" || r.URL.Path == "" {
		r.URL.Path = "/"
	}

	appInstance := getApp()

	if appInstance == nil || appInstance.Handler == nil {
		http.Error(w, "Service Unavailable: Failed to initialize backend application", http.StatusServiceUnavailable)
		return
	}

	appInstance.Handler.ServeHTTP(w, r)
}
