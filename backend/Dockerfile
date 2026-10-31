# ==============================================================================
# Multi-Stage Dockerfile for Craftopia Go Backend Service
# Optimized for minimal image size (~15MB), security (non-root), and cloud deployment
# ==============================================================================

# --- Stage 1: Build binary ---
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install ca-certificates and git (required for fetching dependencies)
RUN apk add --no-cache ca-certificates git

# Cache go modules layer
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically-linked binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.version=1.0.0" \
    -o /app/craftopia-server ./cmd/server

# --- Stage 2: Minimal Production Runtime ---
FROM alpine:3.20 AS runner

WORKDIR /app

# Install CA certificates for secure TLS/HTTPS connections (UPI APIs, Cloudinary, etc.)
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security compliance (Principle of Least Privilege)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled binary from builder
COPY --from=builder /app/craftopia-server /app/craftopia-server

# Switch to non-root user
USER appuser

# Expose default HTTP server port
EXPOSE 8080

# Configure container healthcheck for orchestrators
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health/live || exit 1

ENTRYPOINT ["/app/craftopia-server"]

