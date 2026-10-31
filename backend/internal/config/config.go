package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	DirectURL           string
	JWTSecret           string
	MerchantUPIID       string
	MerchantPayeeName   string
	WhatsAppNumber      string
	CorsOrigin          string
	Environment         string
	IsServerless        bool
	DBMaxConns          int
	DBMinConns          int
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/jamaes_craftopia?sslmode=disable"
	}

	directURL := os.Getenv("DIRECT_URL")
	if directURL == "" {
		directURL = dbURL
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "jamaes-craftopia-super-secret-jwt-key-2026"
	}

	merchantUPI := os.Getenv("MERCHANT_UPI_ID")
	if merchantUPI == "" {
		merchantUPI = "amardeepsarkar8@okhdfcbank"
	}

	payeeName := os.Getenv("MERCHANT_PAYEE_NAME")
	if payeeName == "" {
		payeeName = "Jamae's Craftopia"
	}

	whatsapp := os.Getenv("WHATSAPP_CONTACT_NUMBER")
	if whatsapp == "" {
		whatsapp = "919876543210"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "*"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	isServerless := os.Getenv("VERCEL") != "" || os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != ""

	return &Config{
		Port:              port,
		DatabaseURL:       dbURL,
		DirectURL:         directURL,
		JWTSecret:         jwtSecret,
		MerchantUPIID:     merchantUPI,
		MerchantPayeeName: payeeName,
		WhatsAppNumber:    whatsapp,
		CorsOrigin:        corsOrigin,
		Environment:       env,
		IsServerless:        isServerless,
		DBMaxConns:          GetEnvInt("DB_MAX_CONNS", 0),
		DBMinConns:          GetEnvInt("DB_MIN_CONNS", 0),
		CloudinaryCloudName: os.Getenv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:    os.Getenv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret: os.Getenv("CLOUDINARY_API_SECRET"),
	}
}

func GetEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

