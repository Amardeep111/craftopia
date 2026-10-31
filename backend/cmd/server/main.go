package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"craftopia-backend/internal/app"
	"craftopia-backend/internal/config"
	"craftopia-backend/internal/database"
)

func main() {
	// Initialize structured JSON logging (Standard for cloud platforms & Azure Application Insights)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()
	slog.Info("Starting Craftopia Go Backend Service", "env", cfg.Environment, "port", cfg.Port)

	// Connect to Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg)
	if err != nil {
		slog.Error("Database connection failed. Proceeding with degraded status...", "error", err)
	} else {
		defer db.Close()
	}

	// Setup application handler & routes
	application := app.Setup(cfg, db)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      application.Handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server runner goroutine
	serverErr := make(chan error, 1)
	go func() {
		slog.Info("Server listening", "address", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Graceful shutdown handling (SIGINT, SIGTERM)
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		slog.Error("Server encountered fatal error", "error", err)
	case sig := <-stop:
		slog.Info("Shutdown signal received", "signal", sig.String())
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			slog.Error("Server forced to shutdown", "error", err)
		} else {
			slog.Info("Server stopped cleanly")
		}
	}
}
