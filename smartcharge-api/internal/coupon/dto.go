package coupon

import "time"

// --- Request DTOs ---

// RedeemCouponRequest is the request body for POST /v1/coupons/redeem
type RedeemCouponRequest struct {
	CouponID int32 `json:"couponId" binding:"required,min=1"`
}

// --- Response DTOs ---

// CouponItem is a single coupon from the catalog
type CouponItem struct {
	ID            int32   `json:"id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	CoinCost      int32   `json:"coinCost"`
	DiscountType  string  `json:"discountType"`  // "percentage" or "fixed"
	DiscountValue float64 `json:"discountValue"` // 10 for 10%, or 50 for 50 TL
	Icon          string  `json:"icon"`          // emoji
	CanBuy        bool    `json:"canBuy"`        // user has enough coins?
}

// CouponListResponse is the response for GET /v1/coupons/list
type CouponListResponse struct {
	UserCoins        int32        `json:"userCoins"`
	AvailableCoupons []CouponItem `json:"availableCoupons"`
}

// UserCoupon is a coupon owned by a user
type UserCoupon struct {
	ID            int32   `json:"id"`
	CouponID      int32   `json:"couponId"`
	Name          string  `json:"name"`
	DiscountType  string  `json:"discountType"`
	DiscountValue float64 `json:"discountValue"`
	Icon          string  `json:"icon"`
	Status        string  `json:"status"`    // "ACTIVE", "USED", "EXPIRED"
	Code          string  `json:"code"`      // Unique coupon code / QR code
	ExpiresAt     string  `json:"expiresAt"` // RFC3339 timestamp
	CreatedAt     string  `json:"createdAt"` // RFC3339 timestamp
}

// RedeemCouponResponse is the response for POST /v1/coupons/redeem
type RedeemCouponResponse struct {
	UserCoupon     UserCoupon `json:"userCoupon"`
	RemainingCoins int32      `json:"remainingCoins"`
	Message        string     `json:"message"`
}

// ActiveCouponsResponse is a list of user's active coupons
type ActiveCouponsResponse struct {
	TotalActive int32        `json:"totalActive"`
	Coupons     []UserCoupon `json:"coupons"`
}

// CouponHistoryResponse is a list of all coupons the user created with SmartCoin
type CouponHistoryResponse struct {
	TotalCoupons int32        `json:"totalCoupons"`
	Coupons      []UserCoupon `json:"coupons"`
}

// --- Operator/Admin DTOs ---

type CreateCatalogCouponRequest struct {
	Name          string  `json:"name" binding:"required"`
	Description   string  `json:"description"`
	CoinCost      int32   `json:"coinCost" binding:"required,min=1"`
	DiscountType  string  `json:"discountType" binding:"required,oneof=percentage fixed"`
	DiscountValue float64 `json:"discountValue" binding:"required,gt=0"`
	Icon          string  `json:"icon"`
	IsActive      *bool   `json:"isActive"`
}

type UpdateCatalogCouponRequest struct {
	Name          string   `json:"name"`
	Description   *string  `json:"description"`
	CoinCost      *int32   `json:"coinCost"`
	DiscountType  string   `json:"discountType" binding:"omitempty,oneof=percentage fixed"`
	DiscountValue *float64 `json:"discountValue"`
	Icon          *string  `json:"icon"`
	IsActive      *bool    `json:"isActive"`
}

type AdminCouponListParams struct {
	Limit  int32
	Offset int32
	Active *bool
	Search string
}

type CatalogCoupon struct {
	ID               int32     `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	CoinCost         int32     `json:"coinCost"`
	DiscountType     string    `json:"discountType"`
	DiscountValue    float64   `json:"discountValue"`
	Icon             string    `json:"icon"`
	IsActive         bool      `json:"isActive"`
	TotalUsageCount  int32     `json:"totalUsageCount"`
	ActiveUsageCount int32     `json:"activeUsageCount"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type AdminCouponListResponse struct {
	Coupons []CatalogCoupon `json:"coupons"`
	Total   int64           `json:"total"`
}
