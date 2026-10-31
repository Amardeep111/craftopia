package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/repository"
	"craftopia-backend/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserContextKey contextKey = "currentUser"
	RawTokenKey    contextKey = "rawSessionToken"
)

type JWTClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			isAllowed := false

			if allowedOrigin == "*" {
				if origin != "" {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				} else {
					w.Header().Set("Access-Control-Allow-Origin", "*")
				}
				isAllowed = true
			} else if origin == allowedOrigin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				isAllowed = true
			} else if origin != "" {
				for _, allowed := range strings.Split(allowedOrigin, ",") {
					if strings.TrimSpace(allowed) == origin {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						w.Header().Set("Access-Control-Allow-Credentials", "true")
						isAllowed = true
						break
					}
				}
			}

			if isAllowed {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeaders applies essential HTTP defense headers against XSS, clickjacking, and MIME sniffing
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

// BodyLimit caps incoming request body size based on content type:
// jsonLimit (e.g. 2MB) for JSON APIs, and uploadLimit (e.g. 15MB) for multipart file uploads.
func BodyLimit(jsonLimit int64, uploadLimit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				ct := r.Header.Get("Content-Type")
				if strings.HasPrefix(ct, "multipart/form-data") {
					r.Body = http.MaxBytesReader(w, r.Body, uploadLimit)
				} else {
					r.Body = http.MaxBytesReader(w, r.Body, jsonLimit)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// AuthRequired authenticates requests via AES-256-GCM encrypted session cookie OR Bearer JWT fallback
func AuthRequired(cfg *config.Config, sessionRepo *repository.SessionRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			tokenStr := ""

			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			} else if cookie, err := r.Cookie("jamaes_session"); err == nil {
				tokenStr = cookie.Value
			}

			if tokenStr == "" {
				utils.Error(w, http.StatusUnauthorized, "Authentication required")
				return
			}

			// 1. Check if token is an AES-256-GCM encrypted session cookie (enc.v1...)
			if strings.HasPrefix(tokenStr, "enc.v1.") {
				decryptedToken, err := utils.DecryptSessionCookie(tokenStr, cfg.SessionCookieSecret)
				if err != nil {
					utils.Error(w, http.StatusUnauthorized, "Invalid or expired session")
					return
				}

				session, user, err := sessionRepo.Verify(r.Context(), decryptedToken)
				if err != nil || session == nil || user == nil {
					utils.Error(w, http.StatusUnauthorized, "Invalid or expired session")
					return
				}

				claims := &JWTClaims{
					UserID: user.ID,
					Email:  user.Email,
					Role:   user.Role,
				}

				ctx := context.WithValue(r.Context(), UserContextKey, claims)
				ctx = context.WithValue(ctx, RawTokenKey, session.Token)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// 2. Fallback to stateless JWT authentication
			claims := &JWTClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected JWT signing algorithm")
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err == nil && token.Valid {
				ctx := context.WithValue(r.Context(), UserContextKey, claims)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// 3. Fallback: try raw DB session token (e.g. unencrypted 32-byte hex)
			session, user, err := sessionRepo.Verify(r.Context(), tokenStr)
			if err == nil && session != nil && user != nil {
				claims := &JWTClaims{
					UserID: user.ID,
					Email:  user.Email,
					Role:   user.Role,
				}
				ctx := context.WithValue(r.Context(), UserContextKey, claims)
				ctx = context.WithValue(ctx, RawTokenKey, session.Token)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			utils.Error(w, http.StatusUnauthorized, "Invalid or expired session")
		})
	}
}

func AdminRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(UserContextKey).(*JWTClaims)
		if !ok || claims == nil || (claims.Role != "ADMIN" && claims.Role != "SUPERADMIN") {
			utils.Error(w, http.StatusForbidden, "Admin privileges required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUserFromContext(ctx context.Context) (*JWTClaims, error) {
	claims, ok := ctx.Value(UserContextKey).(*JWTClaims)
	if !ok || claims == nil {
		return nil, errors.New("no user found in context")
	}
	return claims, nil
}

func GetRawSessionTokenFromContext(ctx context.Context) string {
	if token, ok := ctx.Value(RawTokenKey).(string); ok {
		return token
	}
	return ""
}

func GenerateToken(userID, email, role, secret string, duration time.Duration) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
