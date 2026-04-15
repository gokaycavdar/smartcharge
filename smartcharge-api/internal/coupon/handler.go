package coupon

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for coupon operations
type Handler struct {
	service *Service
}

// NewHandler creates a new coupon handler
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers coupon routes to the Gin engine.
// Auth middleware is injected from main with the real JWT secret.
func RegisterRoutes(engine *gin.Engine, handler *Handler, authMiddleware gin.HandlerFunc) {
	coupons := engine.Group("/v1/coupons", authMiddleware)
	{
		// GET /v1/coupons/list - Get available coupons and user's coin balance
		coupons.GET("/list", handler.GetAvailableCoupons)

		// POST /v1/coupons/redeem - Redeem a coupon (convert coins to coupon)
		coupons.POST("/redeem", handler.RedeemCoupon)

		// GET /v1/coupons/active - Get user's active coupons
		coupons.GET("/active", handler.GetUserActiveCoupons)
	}
}

// GetAvailableCoupons handles GET /v1/coupons/list
// Returns available coupons from catalog with user's current coin balance
func (h *Handler) GetAvailableCoupons(c *gin.Context) {
	// Extract userID from JWT context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		response.Err(c, http.StatusUnauthorized, "auth_required", "Authentication required")
		return
	}

	userIDInt32 := userID.(int32)

	// Get available coupons and user's balance
	result, err := h.service.GetAvailableCoupons(c.Request.Context(), userIDInt32)
	if err != nil {
		response.Err(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	response.OK(c, result)
}

// RedeemCoupon handles POST /v1/coupons/redeem
// Converts coins to coupon with ACID transaction guarantee
func (h *Handler) RedeemCoupon(c *gin.Context) {
	// Extract userID from JWT context
	userID, exists := c.Get("userID")
	if !exists {
		response.Err(c, http.StatusUnauthorized, "auth_required", "Authentication required")
		return
	}

	userIDInt32 := userID.(int32)

	// Parse request body
	var req RedeemCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, http.StatusBadRequest, "validation_error", "Invalid request body")
		return
	}

	// Call service (with ACID transaction)
	result, err := h.service.RedeemCoupon(c.Request.Context(), userIDInt32, req.CouponID)
	if err != nil {
		// Determine HTTP status code based on error type
		status := http.StatusInternalServerError
		code := "internal_error"

		if err.Error() == "Not found" {
			status = http.StatusNotFound
			code = "not_found"
		} else if err.Error() != "" && len(err.Error()) > 0 {
			// Check if it's a conflict error (not enough coins)
			if err.Error()[:3] == "Not" { // "Not enough coins..."
				status = http.StatusConflict
				code = "insufficient_coins"
			}
		}

		response.Err(c, status, code, err.Error())
		return
	}

	response.OK(c, result)
}

// GetUserActiveCoupons handles GET /v1/coupons/active
// Returns user's active, non-expired coupons
func (h *Handler) GetUserActiveCoupons(c *gin.Context) {
	// Extract userID from JWT context
	userID, exists := c.Get("userID")
	if !exists {
		response.Err(c, http.StatusUnauthorized, "auth_required", "Authentication required")
		return
	}

	userIDInt32 := userID.(int32)

	// Get active coupons
	result, err := h.service.GetUserActiveCoupons(c.Request.Context(), userIDInt32)
	if err != nil {
		response.Err(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	response.OK(c, result)
}
