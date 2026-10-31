package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"craftopia-backend/internal/utils"
)

type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		slog.Info("HTTP Request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.statusCode,
			"duration_ms", duration.Milliseconds(),
			"remote_ip", r.RemoteAddr,
		)
	})
}

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("PANIC RECOVERED in HTTP handler",
					"error", rec,
					"stack", string(debug.Stack()),
				)
				utils.Error(w, http.StatusInternalServerError, "An unexpected internal server error occurred.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

