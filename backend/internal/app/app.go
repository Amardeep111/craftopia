package app

import (
	"net/http"

	"craftopia-backend/internal/config"
	"craftopia-backend/internal/database"
	"craftopia-backend/internal/handlers"
	"craftopia-backend/internal/middleware"
	"craftopia-backend/internal/repository"
)

type App struct {
	Handler http.Handler
	DB      *database.DB
	Config  *config.Config
}

func Setup(cfg *config.Config, db *database.DB) *App {
	// Initialize Repositories
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	customReqRepo := repository.NewCustomRequestRepository(db)
	userRepo := repository.NewUserRepository(db)
	cartRepo := repository.NewCartRepository(db)
	couponRepo := repository.NewCouponRepository(db)
	addressRepo := repository.NewAddressRepository(db)
	reviewRepo := repository.NewReviewRepository(db)
	contactRepo := repository.NewContactRepository(db)

	// Initialize Handlers
	healthHandler := handlers.NewHealthHandler(db)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo)
	customReqHandler := handlers.NewCustomRequestHandler(customReqRepo)
	paymentHandler := handlers.NewPaymentHandler(cfg)
	authHandler := handlers.NewAuthHandler(userRepo, cfg)
	extraHandler := handlers.NewExtraHandlers(cartRepo, couponRepo, addressRepo, reviewRepo, contactRepo, orderRepo)
	uploadHandler := handlers.NewUploadHandler(cfg)

	// Router setup using Go 1.22+ Standard ServeMux
	mux := http.NewServeMux()

	// Cloud & Container Health Probes
	mux.HandleFunc("GET /health", healthHandler.Liveness)
	mux.HandleFunc("GET /health/live", healthHandler.Liveness)
	mux.HandleFunc("GET /health/ready", healthHandler.Readiness)
	mux.HandleFunc("GET /api/health", healthHandler.Readiness)

	// Catalog & Products
	mux.HandleFunc("GET /api/categories", productHandler.ListCategories)
	mux.HandleFunc("GET /api/products", productHandler.ListProducts)
	mux.HandleFunc("GET /api/products/{id}", productHandler.GetProduct)

	// Authentication
	mux.HandleFunc("POST /api/auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.Handle("GET /api/auth/me", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(authHandler.Me)))

	// Cart
	mux.Handle("GET /api/cart", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(extraHandler.GetCart)))
	mux.Handle("PUT /api/cart", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(extraHandler.SaveCart)))
	mux.HandleFunc("POST /api/cart/validate", extraHandler.ValidateCart)

	// Coupons
	mux.HandleFunc("POST /api/coupons/validate", extraHandler.ValidateCoupon)

	// Addresses
	mux.Handle("GET /api/addresses", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(extraHandler.ListAddresses)))
	mux.Handle("POST /api/addresses", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(extraHandler.CreateAddress)))
	mux.Handle("DELETE /api/addresses/{id}", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(extraHandler.DeleteAddress)))

	// Reviews
	mux.HandleFunc("GET /api/reviews/{productId}", extraHandler.GetProductReviews)

	// Contact
	mux.HandleFunc("POST /api/contact", extraHandler.CreateContactMessage)

	// Helper for protected admin routes
	adminAuth := func(h http.HandlerFunc) http.Handler {
		return middleware.AuthRequired(cfg.JWTSecret)(middleware.AdminRequired(h))
	}

	// Orders & Payment
	mux.HandleFunc("POST /api/orders", orderHandler.CreateOrder)
	mux.HandleFunc("GET /api/orders/{id}", orderHandler.GetOrder)
	mux.Handle("GET /api/orders", middleware.AuthRequired(cfg.JWTSecret)(http.HandlerFunc(orderHandler.ListMyOrders)))
	mux.Handle("PATCH /api/orders/{id}/verify-payment", adminAuth(orderHandler.VerifyUPIPayment))
	mux.HandleFunc("GET /api/payment/upi-details", paymentHandler.GetUPIDetails)

	// Custom Requests
	mux.HandleFunc("POST /api/custom-requests", customReqHandler.Create)
	mux.Handle("GET /api/custom-requests", adminAuth(customReqHandler.List))
	mux.Handle("POST /api/custom-requests/{id}/accept", adminAuth(customReqHandler.AcceptAndCreateOrder))

	// Admin routes
	mux.Handle("GET /api/admin/orders", adminAuth(orderHandler.ListMyOrders))
	mux.Handle("GET /api/admin/orders/{id}", adminAuth(orderHandler.GetOrder))
	mux.Handle("PATCH /api/admin/orders", adminAuth(orderHandler.VerifyUPIPayment))
	mux.Handle("GET /api/admin/custom-requests", adminAuth(customReqHandler.List))
	mux.Handle("PATCH /api/admin/custom-requests", adminAuth(customReqHandler.AcceptAndCreateOrder))

	// Image Uploads & Direct-to-Cloud Presigned Signatures
	mux.Handle("GET /api/upload/sign", adminAuth(uploadHandler.GeneratePresignedSignature))
	mux.Handle("POST /api/upload", adminAuth(uploadHandler.Upload))

	// Global Middleware Chain: Recovery -> SecurityHeaders -> BodyLimit (2MB JSON, 15MB Multipart) -> Logger -> CORS
	handler := middleware.Recovery(
		middleware.SecurityHeaders(
			middleware.BodyLimit(2<<20, 15<<20)(
				middleware.Logger(
					middleware.CORS(cfg.CorsOrigin)(mux),
				),
			),
		),
	)

	return &App{
		Handler: handler,
		DB:      db,
		Config:  cfg,
	}
}

