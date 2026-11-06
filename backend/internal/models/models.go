package models

import (
	"encoding/json"
	"time"
)

type Category struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description *string   `json:"description,omitempty"`
	Accent      *string   `json:"accent,omitempty"`
	Image       *string   `json:"image,omitempty"`
	Published   bool      `json:"published"`
	Hidden      bool      `json:"hidden"`
	Order       int       `json:"order"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Product struct {
	ID                    string          `json:"id"`
	Name                  string          `json:"name"`
	Slug                  string          `json:"slug"`
	CategoryID            string          `json:"categoryId"`
	Category              *Category       `json:"category,omitempty"`
	Price                 int             `json:"price"` // in paise / integer units
	DiscountPercent       int             `json:"discountPercent"`
	GSTPercent            int             `json:"gstPercent"`
	CODFee                int             `json:"codFee"`
	OtherCharge           int             `json:"otherCharge"`
	Featured              bool            `json:"featured"`
	Short                 string          `json:"short"`
	Description           string          `json:"description"`
	Materials             *string         `json:"materials,omitempty"`
	Care                  *string         `json:"care,omitempty"`
	Customization         *string         `json:"customization,omitempty"`
	Visual                *string         `json:"visual,omitempty"`
	Palette               json.RawMessage `json:"palette,omitempty"`
	Images                json.RawMessage `json:"images,omitempty"`
	ImageURL              *string         `json:"imageUrl,omitempty"`
	CloudinaryPublicID    *string         `json:"cloudinaryPublicId,omitempty"`
	Stock                 int             `json:"stock"`
	Published             bool            `json:"published"`
	AvailableForSale      bool            `json:"availableForSale"`
	UnavailableStates     []string        `json:"unavailableStates"`
	UnavailablePinCodes   []string        `json:"unavailablePinCodes"`
	AllowedPaymentMethods []string        `json:"allowedPaymentMethods"`
	CreatedAt             time.Time       `json:"createdAt"`
	UpdatedAt             time.Time       `json:"updatedAt"`
}

// AdminProductSummary contains only fields used in the catalog grid. Long
// description text is loaded on demand when an admin opens the editor.
type AdminProductSummary struct {
	ID                    string          `json:"id"`
	Name                  string          `json:"name"`
	Slug                  string          `json:"slug"`
	CategoryID            string          `json:"categoryId"`
	Category              *Category       `json:"category,omitempty"`
	Price                 int             `json:"price"`
	DiscountPercent       int             `json:"discountPercent"`
	GSTPercent            int             `json:"gstPercent"`
	CODFee                int             `json:"codFee"`
	OtherCharge           int             `json:"otherCharge"`
	Featured              bool            `json:"featured"`
	Visual                *string         `json:"visual,omitempty"`
	Palette               json.RawMessage `json:"palette,omitempty"`
	Images                json.RawMessage `json:"images,omitempty"`
	ImageURL              *string         `json:"imageUrl,omitempty"`
	Stock                 int             `json:"stock"`
	Published             bool            `json:"published"`
	AvailableForSale      bool            `json:"availableForSale"`
	UnavailableStates     []string        `json:"unavailableStates"`
	UnavailablePinCodes   []string        `json:"unavailablePinCodes"`
	AllowedPaymentMethods []string        `json:"allowedPaymentMethods"`
}

type ShippingAddress struct {
	FullName          string  `json:"fullName"`
	MobileNumber      string  `json:"mobileNumber"`
	HouseFlatBuilding string  `json:"houseFlatBuilding"`
	AreaStreet        string  `json:"areaStreet"`
	Landmark          *string `json:"landmark,omitempty"`
	City              string  `json:"city"`
	State             string  `json:"state"`
	PinCode           string  `json:"pinCode"`
	Country           string  `json:"country,omitempty"`
}

type OrderStatus string

const (
	OrderStatusPending         OrderStatus = "PENDING"
	OrderStatusConfirmed       OrderStatus = "CONFIRMED"
	OrderStatusInProgress      OrderStatus = "IN_PROGRESS"
	OrderStatusShipped         OrderStatus = "SHIPPED"
	OrderStatusDelivered       OrderStatus = "DELIVERED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusReturnRequested OrderStatus = "RETURN_REQUESTED"
	OrderStatusReturnApproved  OrderStatus = "RETURN_APPROVED"
	OrderStatusReturnInTransit OrderStatus = "RETURN_IN_TRANSIT"
	OrderStatusReturned        OrderStatus = "RETURNED"
	OrderStatusRefundRequested OrderStatus = "REFUND_REQUESTED"
)

type PaymentStatus string

const (
	PaymentStatusPending              PaymentStatus = "PENDING"
	PaymentStatusAwaitingVerification PaymentStatus = "AWAITING_VERIFICATION"
	PaymentStatusPaid                 PaymentStatus = "PAID"
	PaymentStatusCODPendingCollection PaymentStatus = "COD_PENDING_COLLECTION"
	PaymentStatusCODFinalCollected    PaymentStatus = "COD_COLLECTED"
	PaymentStatusFailed               PaymentStatus = "FAILED"
	PaymentStatusCancelled            PaymentStatus = "CANCELLED"
	PaymentStatusManualReview         PaymentStatus = "MANUAL_REVIEW"
	PaymentStatusRefunded             PaymentStatus = "REFUNDED"
	PaymentStatusRefundRequested      PaymentStatus = "REFUND_REQUESTED"
)

type Order struct {
	ID                string          `json:"id"`
	OrderNumber       string          `json:"orderNumber"`
	UserID            *string         `json:"userId,omitempty"`
	CustomerName      string          `json:"customerName"`
	CustomerEmail     string          `json:"customerEmail"`
	CustomerPhone     *string         `json:"customerPhone,omitempty"`
	ShippingAddress   json.RawMessage `json:"shippingAddress,omitempty"`
	Status            OrderStatus     `json:"status"`
	PaymentMethod     *string         `json:"paymentMethod,omitempty"`
	PaymentStatus     PaymentStatus   `json:"paymentStatus"`
	PaymentReference  *string         `json:"paymentReference,omitempty"`
	TotalAmount       int             `json:"totalAmount"`
	Subtotal          int             `json:"subtotal"`
	Discount          int             `json:"discount"`
	Shipping          int             `json:"shipping"`
	Fee               int             `json:"fee"`
	Notes             *string         `json:"notes,omitempty"`
	TrackingNumber    *string         `json:"trackingNumber,omitempty"`
	ShippingPartner   *string         `json:"shippingPartner,omitempty"`
	EstimatedDelivery *string         `json:"estimatedDelivery,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
	Items             []OrderItem     `json:"items,omitempty"`
	PaymentLogs       []PaymentLog    `json:"paymentLogs,omitempty"`
	RefundRequests    []RefundRequest `json:"refundRequests,omitempty"`
}

type OrderItem struct {
	ID            string    `json:"id"`
	OrderID       string    `json:"orderId"`
	ProductID     string    `json:"productId"`
	Product       *Product  `json:"product,omitempty"`
	Quantity      int       `json:"quantity"`
	UnitPrice     int       `json:"unitPrice"`
	GSTPercent    int       `json:"gstPercent"`
	GSTAmount     int       `json:"gstAmount"`
	CODFee        int       `json:"codFee"`
	OtherCharge   int       `json:"otherCharge"`
	Customization *string   `json:"customization,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
}

type PaymentLog struct {
	ID                string        `json:"id"`
	OrderID           string        `json:"orderId"`
	Amount            int           `json:"amount"`
	Status            PaymentStatus `json:"status"`
	Provider          *string       `json:"provider,omitempty"`
	ProviderReference *string       `json:"providerReference,omitempty"`
	Method            *string       `json:"method,omitempty"`
	UTR               *string       `json:"utr,omitempty"`
	VerifiedBy        *string       `json:"verifiedBy,omitempty"`
	VerifiedAt        *time.Time    `json:"verifiedAt,omitempty"`
	CreatedAt         time.Time     `json:"createdAt"`
}

type CustomRequestStatus string

const (
	RequestStatusNew        CustomRequestStatus = "NEW"
	RequestStatusReviewing  CustomRequestStatus = "REVIEWING"
	RequestStatusQuoted     CustomRequestStatus = "QUOTED"
	RequestStatusAccepted   CustomRequestStatus = "ACCEPTED"
	RequestStatusInProgress CustomRequestStatus = "IN_PROGRESS"
	RequestStatusCompleted  CustomRequestStatus = "COMPLETED"
	RequestStatusDeclined   CustomRequestStatus = "DECLINED"
)

type CustomRequest struct {
	ID              string              `json:"id"`
	UserID          *string             `json:"userId,omitempty"`
	Name            string              `json:"name"`
	Contact         string              `json:"contact"`
	Idea            string              `json:"idea"`
	Category        *string             `json:"category,omitempty"`
	Colors          *string             `json:"colors,omitempty"`
	Budget          *string             `json:"budget,omitempty"`
	Occasion        *string             `json:"occasion,omitempty"`
	Details         string              `json:"details"`
	ReferenceImages []string            `json:"referenceImages"`
	QuotedPrice     *int                `json:"quotedPrice,omitempty"`
	Status          CustomRequestStatus `json:"status"`
	AdminNotes      *string             `json:"adminNotes,omitempty"`
	CreatedAt       time.Time           `json:"createdAt"`
	UpdatedAt       time.Time           `json:"updatedAt"`
}

type CartItem struct {
	ID        string    `json:"id"`
	CartID    string    `json:"cartId"`
	ProductID string    `json:"productId"`
	Product   *Product  `json:"product,omitempty"`
	Quantity  int       `json:"quantity"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type User struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	Password         string    `json:"-"` // Never expose in JSON
	Name             *string   `json:"name,omitempty"`
	Phone            *string   `json:"phone,omitempty"`
	Role             string    `json:"role"`
	EmailVerified    bool      `json:"emailVerified"`
	AdminActive      bool      `json:"adminActive"`
	AdminPermissions []string  `json:"adminPermissions"`
	Active           bool      `json:"active"`
	OrderCount       int64     `json:"orderCount,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type StoreSetting struct {
	ID             string  `json:"id"`
	MerchantVPA    *string `json:"merchantVpa,omitempty"`
	MerchantName   string  `json:"merchantName"`
	WhatsAppNumber *string `json:"whatsappNumber,omitempty"`
}

type CreateOrderRequest struct {
	CustomerName     string          `json:"customerName"`
	CustomerEmail    string          `json:"customerEmail"`
	CustomerPhone    *string         `json:"customerPhone,omitempty"`
	ShippingAddress  json.RawMessage `json:"shippingAddress"`
	PaymentMethod    string          `json:"paymentMethod"`
	PaymentReference *string         `json:"paymentReference,omitempty"`
	CouponCode       *string         `json:"couponCode,omitempty"`
	Notes            *string         `json:"notes,omitempty"`
	Items            []struct {
		ProductID string `json:"productId"`
		Quantity  int    `json:"quantity"`
	} `json:"items"`
}

type AcceptCustomRequestPayload struct {
	BasePrice         int             `json:"basePrice"`
	GSTPercent        int             `json:"gstPercent"`
	ShippingFee       int             `json:"shippingFee"`
	OtherCharge       int             `json:"otherCharge"`
	CustomerName      string          `json:"customerName"`
	CustomerEmail     string          `json:"customerEmail"`
	CustomerPhone     string          `json:"customerPhone"`
	ShippingAddress   json.RawMessage `json:"shippingAddress"`
	PaymentMethod     string          `json:"paymentMethod"`
	EstimatedDelivery string          `json:"estimatedDelivery"`
	AdminNotes        string          `json:"adminNotes"`
}

type Session struct {
	ID        string     `json:"id"`
	UserID    string     `json:"userId"`
	User      *User      `json:"user,omitempty"`
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expiresAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type AdminDashboardStats struct {
	Orders   int `json:"orders"`
	Users    int `json:"users"`
	Products int `json:"products"`
	Pending  int `json:"pending"`
}

type RefundRequest struct {
	ID          string     `json:"id"`
	OrderID     string     `json:"orderId"`
	Reason      string     `json:"reason"`
	Amount      int        `json:"amount"`
	RefundUPIID string     `json:"refundUpiId"`
	Status      string     `json:"status"`
	AdminNote   *string    `json:"adminNote,omitempty"`
	ReviewedBy  *string    `json:"reviewedBy,omitempty"`
	ReviewedAt  *time.Time `json:"reviewedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type PromotionProduct struct {
	ID              string `json:"id"`
	DiscountPercent int    `json:"discountPercent"`
	GSTPercent      int    `json:"gstPercent"`
	CODFee          int    `json:"codFee"`
	OtherCharge     int    `json:"otherCharge"`
}

type EmailVerification struct {
	ID         string          `json:"id"`
	Email      string          `json:"email"`
	CodeHash   string          `json:"codeHash"`
	Payload    json.RawMessage `json:"payload"`
	Attempts   int             `json:"attempts"`
	Resends    int             `json:"resends"`
	ExpiresAt  time.Time       `json:"expiresAt"`
	ConsumedAt *time.Time      `json:"consumedAt,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
}
