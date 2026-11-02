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
	sessionRepo := repository.NewSessionRepository(db)
	settingRepo := repository.NewSettingRepository(db)

	// Initialize Handlers
	healthHandler := handlers.NewHealthHandler(db)
	productHandler := handlers.NewProductHandler(productRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo)
	customReqHandler := handlers.NewCustomRequestHandler(customReqRepo)
	paymentHandler := handlers.NewPaymentHandler(cfg, settingRepo)
	authHandler := handlers.NewAuthHandler(userRepo, sessionRepo, cfg)
	extraHandler := handlers.NewExtraHandlers(cartRepo, couponRepo, addressRepo, reviewRepo, contactRepo, orderRepo, userRepo)
	adminHandler := handlers.NewAdminHandler(orderRepo, productRepo, userRepo, couponRepo, settingRepo)
	adminAccessHandler := handlers.NewAdminAccessHandler(userRepo, sessionRepo, cfg)
	uploadHandler := handlers.NewUploadHandler(cfg)

	// Router setup using Go 1.22+ Standard ServeMux
	mux := http.NewServeMux()

	// Auth Middleware Helpers
	auth := middleware.AuthRequired(cfg, sessionRepo)
	adminAuth := func(h http.HandlerFunc) http.Handler {
		return auth(middleware.AdminRequired(h))
	}

	// 1. Cloud & Container Health Probes (Exact matching where appropriate)
	mux.HandleFunc("GET /health", healthHandler.Liveness)
	mux.HandleFunc("GET /health/live", healthHandler.Liveness)
	mux.HandleFunc("GET /health/ready", healthHandler.Readiness)
	mux.HandleFunc("GET /api/health", healthHandler.Readiness)
	mux.HandleFunc("GET /api/{$}", healthHandler.Readiness)
	mux.HandleFunc("GET /{$}", healthHandler.Readiness)

	// 2. Public Catalog
	mux.HandleFunc("GET /api/categories", productHandler.ListCategories)
	mux.HandleFunc("GET /api/products", productHandler.ListProducts)
	mux.HandleFunc("GET /api/promotions", productHandler.ListPromotions)
	mux.HandleFunc("GET /api/products/{id}", productHandler.GetProduct)

	// 3. Authentication & Sessions (AES-256-GCM Cookie + DB Session)
	mux.HandleFunc("POST /api/auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("POST /api/auth/logout", authHandler.Logout)
	mux.Handle("POST /api/auth/heartbeat", adminAuth(authHandler.Heartbeat))
	mux.HandleFunc("POST /api/auth/otp", authHandler.RequestOTP)
	mux.HandleFunc("POST /api/auth/verify", authHandler.VerifyOTP)
	mux.HandleFunc("GET /api/auth/password-key", authHandler.PasswordKey)
	mux.Handle("GET /api/auth/me", auth(http.HandlerFunc(authHandler.Me)))

	// 4. Customer Account & Profile
	mux.Handle("PATCH /api/account/profile", auth(http.HandlerFunc(extraHandler.UpdateProfile)))
	mux.Handle("POST /api/account/password", auth(http.HandlerFunc(authHandler.ChangePassword)))
	mux.Handle("POST /api/account/password/verify", auth(http.HandlerFunc(authHandler.VerifyChangePassword)))

	// 5. Cart
	mux.Handle("GET /api/cart", auth(http.HandlerFunc(extraHandler.GetCart)))
	mux.Handle("PUT /api/cart", auth(http.HandlerFunc(extraHandler.SaveCart)))
	mux.HandleFunc("POST /api/cart/validate", extraHandler.ValidateCart)

	// 6. Coupons
	mux.HandleFunc("GET /api/coupons", extraHandler.ListCoupons)
	mux.HandleFunc("POST /api/coupons/validate", extraHandler.ValidateCoupon)

	// 7. Addresses
	mux.Handle("GET /api/addresses", auth(http.HandlerFunc(extraHandler.ListAddresses)))
	mux.Handle("POST /api/addresses", auth(http.HandlerFunc(extraHandler.CreateAddress)))
	mux.Handle("PATCH /api/addresses", auth(http.HandlerFunc(extraHandler.UpdateAddress)))
	mux.Handle("DELETE /api/addresses/{id}", auth(http.HandlerFunc(extraHandler.DeleteAddress)))
	mux.Handle("DELETE /api/addresses", auth(http.HandlerFunc(extraHandler.DeleteAddress)))

	// 8. Reviews
	mux.HandleFunc("GET /api/reviews/{productId}", extraHandler.GetProductReviews)
	mux.Handle("POST /api/reviews/{productId}", auth(http.HandlerFunc(extraHandler.CreateProductReview)))
	mux.Handle("POST /api/reviews/upload", auth(http.HandlerFunc(uploadHandler.UploadReviewImages)))

	// 9. Contact
	mux.HandleFunc("POST /api/contact", extraHandler.CreateContactMessage)
	mux.HandleFunc("GET /api/location/detect", extraHandler.DetectLocation)
	mux.HandleFunc("POST /api/geocode", extraHandler.Geocode)

	// 10. Orders & Payment
	mux.HandleFunc("POST /api/orders", orderHandler.CreateOrder)
	mux.HandleFunc("GET /api/orders/{id}", orderHandler.GetOrder)
	mux.Handle("GET /api/orders", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("orderNumber") != "" {
			orderHandler.ListOrGetOrders(w, r)
			return
		}
		auth(http.HandlerFunc(orderHandler.ListOrGetOrders)).ServeHTTP(w, r)
	}))
	mux.Handle("POST /api/orders/cancel", auth(http.HandlerFunc(orderHandler.CancelOrder)))
	mux.Handle("POST /api/orders/refund", auth(http.HandlerFunc(orderHandler.RequestRefund)))
	mux.Handle("PATCH /api/orders/{id}/verify-payment", adminAuth(orderHandler.VerifyUPIPayment))
	mux.HandleFunc("GET /api/payment/upi-details", paymentHandler.GetUPIDetails)
	mux.HandleFunc("POST /api/payment/initialize", paymentHandler.Initialize)
	mux.HandleFunc("POST /api/payment/confirm", paymentHandler.Confirm)
	mux.HandleFunc("POST /api/payment/fee", paymentHandler.Fee)

	// 11. Custom Requests
	mux.HandleFunc("POST /api/custom-requests", customReqHandler.Create)
	mux.Handle("POST /api/custom-requests/upload", auth(http.HandlerFunc(uploadHandler.UploadCustomRequestImage)))
	mux.Handle("GET /api/custom-requests", adminAuth(customReqHandler.List))
	mux.Handle("POST /api/custom-requests/{id}/accept", adminAuth(customReqHandler.AcceptAndCreateOrder))

	// 12. Site & About Settings (Public)
	mux.HandleFunc("GET /api/site", adminHandler.GetSite)
	mux.HandleFunc("GET /api/about", adminHandler.GetAbout)

	// 13. Admin Management Endpoints
	mux.Handle("GET /api/admin/dashboard", adminAuth(adminHandler.GetDashboard))
	mux.Handle("GET /api/admin/orders", adminAuth(adminHandler.ListOrders))
	mux.Handle("PATCH /api/admin/orders", adminAuth(adminHandler.UpdateOrder))
	mux.Handle("GET /api/admin/orders/{id}", adminAuth(orderHandler.GetOrder))

	mux.Handle("GET /api/admin/products", adminAuth(adminHandler.ListProducts))
	mux.Handle("GET /api/admin/products/{id}", adminAuth(adminHandler.GetProduct))
	mux.Handle("POST /api/admin/products", adminAuth(adminHandler.CreateProduct))
	mux.Handle("PATCH /api/admin/products", adminAuth(adminHandler.UpdateProduct))
	mux.Handle("PATCH /api/admin/products/{id}", adminAuth(adminHandler.UpdateProduct))
	mux.Handle("PUT /api/admin/products/{id}", adminAuth(adminHandler.UpdateProduct))
	mux.Handle("DELETE /api/admin/products/{id}", adminAuth(adminHandler.DeleteProduct))

	mux.Handle("GET /api/admin/categories", adminAuth(adminHandler.ListCategories))
	mux.Handle("POST /api/admin/categories", adminAuth(adminHandler.CreateCategory))
	mux.Handle("PATCH /api/admin/categories", adminAuth(adminHandler.UpdateCategory))
	mux.Handle("PATCH /api/admin/categories/{id}", adminAuth(adminHandler.UpdateCategory))
	mux.Handle("PUT /api/admin/categories/{id}", adminAuth(adminHandler.UpdateCategory))
	mux.Handle("DELETE /api/admin/categories/{id}", adminAuth(adminHandler.DeleteCategory))

	mux.Handle("GET /api/admin/coupons", adminAuth(adminHandler.ListCoupons))
	mux.Handle("POST /api/admin/coupons", adminAuth(adminHandler.CreateCoupon))
	mux.Handle("PATCH /api/admin/coupons", adminAuth(adminHandler.ToggleCoupon))
	mux.Handle("DELETE /api/admin/coupons/{id}", adminAuth(adminHandler.DeleteCoupon))

	mux.Handle("GET /api/admin/users", adminAuth(adminHandler.ListUsers))
	mux.Handle("PATCH /api/admin/users", adminAuth(adminHandler.ToggleUser))
	mux.Handle("GET /api/admin/admins", adminAuth(adminAccessHandler.List))
	mux.Handle("POST /api/admin/admins", adminAuth(adminAccessHandler.Create))
	mux.Handle("PATCH /api/admin/admins", adminAuth(adminAccessHandler.Update))
	mux.Handle("DELETE /api/admin/admins", adminAuth(adminAccessHandler.Delete))
	mux.Handle("POST /api/admin/admins/password", adminAuth(adminAccessHandler.ResetPassword))

	mux.Handle("GET /api/admin/site", adminAuth(adminHandler.GetSite))
	mux.Handle("PUT /api/admin/site", adminAuth(adminHandler.UpdateSite))
	mux.Handle("PATCH /api/admin/site", adminAuth(adminHandler.UpdateSite))
	mux.Handle("GET /api/admin/settings", adminAuth(adminHandler.GetSite))
	mux.Handle("PATCH /api/admin/settings", adminAuth(adminHandler.UpdateSite))
	mux.Handle("GET /api/admin/about", adminAuth(adminHandler.GetAbout))
	mux.Handle("PUT /api/admin/about", adminAuth(adminHandler.UpdateAbout))
	mux.Handle("PATCH /api/admin/about", adminAuth(adminHandler.UpdateAbout))

	mux.Handle("GET /api/admin/custom-requests", adminAuth(customReqHandler.List))
	mux.Handle("PATCH /api/admin/custom-requests", adminAuth(customReqHandler.Update))

	// 14. Image Uploads & Presigned Cloudinary Signatures
	mux.Handle("GET /api/upload/sign", adminAuth(uploadHandler.GeneratePresignedSignature))
	mux.Handle("POST /api/upload", adminAuth(uploadHandler.Upload))
	mux.Handle("DELETE /api/upload", adminAuth(uploadHandler.Delete))
	if !cfg.IsServerless {
		mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("public/uploads"))))
	}

	// Global Middleware Chain
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
