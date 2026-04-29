package coupon

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
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
	operatorCoupons := engine.Group("/v1/operator/coupons", authMiddleware)
	{
		// GET /v1/coupons/list - Get available coupons and user's coin balance
		coupons.GET("/list", handler.GetAvailableCoupons)

		// POST /v1/coupons/redeem - Redeem a coupon (convert coins to coupon)
		coupons.POST("/redeem", handler.RedeemCoupon)

		// GET /v1/coupons/active - Get user's active coupons
		coupons.GET("/active", handler.GetUserActiveCoupons)

		// GET /v1/coupons/history - Get all coupons created by user
		coupons.GET("/history", handler.GetUserCouponHistory)

		// Operator/Admin routes
		operatorCoupons.POST("", handler.CreateCouponAdmin)
		operatorCoupons.GET("", handler.ListCouponsAdmin)
		operatorCoupons.GET("/:id", handler.GetCouponAdmin)
		operatorCoupons.PUT("/:id", handler.UpdateCouponAdmin)
		operatorCoupons.DELETE("/:id", handler.DeleteOrDeactivateCouponAdmin)
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

// GetUserCouponHistory handles GET /v1/coupons/history
// Returns all coupons created by the user (active, used, expired)
func (h *Handler) GetUserCouponHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Err(c, http.StatusUnauthorized, "auth_required", "Authentication required")
		return
	}

	userIDInt32 := userID.(int32)

	result, err := h.service.GetUserCouponHistory(c.Request.Context(), userIDInt32)
	if err != nil {
		response.Err(c, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	response.OK(c, result)
}

func (h *Handler) ListCouponsAdmin(c *gin.Context) {
	if _, ok := requireOperator(c); !ok {
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var activePtr *bool
	if activeRaw := c.Query("active"); activeRaw != "" {
		parsed, err := strconv.ParseBool(activeRaw)
		if err != nil {
			response.Err(c, 400, "VALIDATION_ERROR", "active must be true or false")
			return
		}
		activePtr = &parsed
	}

	result, err := h.service.ListCouponsAdmin(c.Request.Context(), AdminCouponListParams{
		Limit:  int32(limit),
		Offset: int32(offset),
		Active: activePtr,
		Search: c.Query("search"),
	})
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *Handler) GetCouponAdmin(c *gin.Context) {
	if _, ok := requireOperator(c); !ok {
		return
	}

	id, err := parseCouponID(c)
	if err != nil {
		return
	}

	result, err := h.service.GetCouponByIDAdmin(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *Handler) CreateCouponAdmin(c *gin.Context) {
	if _, ok := requireOperator(c); !ok {
		return
	}

	var req CreateCatalogCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "name, coinCost, discountType and discountValue are required")
		return
	}

	result, err := h.service.CreateCoupon(c.Request.Context(), req)
	if err != nil {
		handleError(c, err)
		return
	}

	response.Created(c, result)
}

func (h *Handler) UpdateCouponAdmin(c *gin.Context) {
	if _, ok := requireOperator(c); !ok {
		return
	}

	id, err := parseCouponID(c)
	if err != nil {
		return
	}

	var req UpdateCatalogCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	result, err := h.service.UpdateCoupon(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, result)
}

func (h *Handler) DeleteOrDeactivateCouponAdmin(c *gin.Context) {
	if _, ok := requireOperator(c); !ok {
		return
	}

	id, err := parseCouponID(c)
	if err != nil {
		return
	}

	if c.Query("hard") == "true" {
		if err := h.service.DeleteCoupon(c.Request.Context(), id); err != nil {
			handleError(c, err)
			return
		}
		response.OK(c, gin.H{"message": "Coupon deleted"})
		return
	}

	updated, err := h.service.DeactivateCoupon(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, gin.H{
		"message": "Coupon deactivated",
		"coupon":  updated,
	})
}

func requireOperator(c *gin.Context) (int32, bool) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return 0, false
	}

	role, ok := middleware.GetUserRole(c)
	if !ok || role != "OPERATOR" {
		response.Err(c, 403, "AUTH_FORBIDDEN", "Only operator accounts can manage coupons")
		return 0, false
	}

	return userID, true
}

func parseCouponID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid coupon ID")
		return 0, err
	}
	return int32(val), nil
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "An unexpected error occurred")
}
