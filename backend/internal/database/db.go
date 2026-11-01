package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"craftopia-backend/internal/config"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func Connect(ctx context.Context, cfg *config.Config) (*DB, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database url: %w", err)
	}

	// Cloud & Serverless-aware connection pool defaults
	if cfg.IsServerless {
		// Serverless (Vercel / AWS Lambda): keep minimal connections to avoid pool exhaustion
		poolConfig.MaxConns = 3
		poolConfig.MinConns = 0
		poolConfig.MaxConnLifetime = 15 * time.Minute
		poolConfig.MaxConnIdleTime = 30 * time.Second
		// Supabase's transaction pooler can reuse a PostgreSQL connection for a
		// different client transaction. Named prepared statements may then
		// collide with statements left on that connection (SQLSTATE 42P05).
		poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
		poolConfig.ConnConfig.StatementCacheCapacity = 0
		poolConfig.ConnConfig.DescriptionCacheCapacity = 0
	} else {
		// Dedicated containers & VMs (Azure App Service, AWS EC2, VPS)
		poolConfig.MaxConns = 25
		poolConfig.MinConns = 2
		poolConfig.MaxConnLifetime = 1 * time.Hour
		poolConfig.MaxConnIdleTime = 15 * time.Minute
	}

	if cfg.DBMaxConns > 0 {
		poolConfig.MaxConns = int32(cfg.DBMaxConns)
	}
	if cfg.DBMinConns >= 0 && cfg.DBMinConns <= int(poolConfig.MaxConns) {
		poolConfig.MinConns = int32(cfg.DBMinConns)
	}
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	slog.Info("Connecting to PostgreSQL...", "db_url_masked", maskURL(cfg.DatabaseURL))
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify connection
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	slog.Info("Connected to PostgreSQL successfully")
	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

func maskURL(url string) string {
	if len(url) < 15 {
		return "***"
	}
	return url[:12] + "..."
}
