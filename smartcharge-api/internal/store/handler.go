package store

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for store management.
type Handler struct {
	service *Service
}

// NewHandler creates a new store handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers store admin routes.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	storeAdmin := rg.Group("/store", authMiddleware)
	storeUsers := rg.Group("/store", authMiddleware)

	storeUsers.GET("/items", h.ListActiveItems)
	storeUsers.POST("/purchase", h.PurchaseItem)

	storeAdmin.GET("/items/admin", h.ListItemsAdmin)
	storeAdmin.POST("/items", h.CreateItem)
	storeAdmin.PUT("/items/:id", h.UpdateItemPricingStock)
	storeAdmin.DELETE("/items/:id", h.DeleteOrDeactivateItem)
}

// ListItemsAdmin handles GET /v1/store/items/admin for operators.
func (h *Handler) ListItemsAdmin(c *gin.Context) {
	if _, ok := requireAdmin(c); !ok {
		return
	}

	items, err := h.service.ListItemsAdmin(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, items)
}

// ListActiveItems handles GET /v1/store/items for authenticated users.
func (h *Handler) ListActiveItems(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	result, err := h.service.ListActiveItems(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, result)
}

// PurchaseItem handles POST /v1/store/purchase for authenticated users.
func (h *Handler) PurchaseItem(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req PurchaseItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "storeItemId is required")
		return
	}

	result, err := h.service.PurchaseItem(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, result)
}

// CreateItem handles POST /v1/store/items.
func (h *Handler) CreateItem(c *gin.Context) {
	adminUserID, ok := requireAdmin(c)
	if !ok {
		return
	}

	var req CreateStoreItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "name, smartcoinPrice and stockQuantity are required")
		return
	}

	item, err := h.service.CreateItem(c.Request.Context(), adminUserID, req)
	if err != nil {
		handleError(c, err)
		return
	}

	response.Created(c, item)
}

// UpdateItemPricingStock handles PUT /v1/store/items/:id.
func (h *Handler) UpdateItemPricingStock(c *gin.Context) {
	if _, ok := requireAdmin(c); !ok {
		return
	}

	itemID, err := parseID(c)
	if err != nil {
		return
	}

	var req UpdateStoreItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "smartcoinPrice and stockQuantity are required")
		return
	}

	item, err := h.service.UpdateItemPricingStock(c.Request.Context(), itemID, req)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, item)
}

// DeleteOrDeactivateItem handles DELETE /v1/store/items/:id.
// Default behavior is soft delete (deactivate). Use ?hard=true for hard delete.
func (h *Handler) DeleteOrDeactivateItem(c *gin.Context) {
	if _, ok := requireAdmin(c); !ok {
		return
	}

	itemID, err := parseID(c)
	if err != nil {
		return
	}

	if c.Query("hard") == "true" {
		if err := h.service.DeleteItem(c.Request.Context(), itemID); err != nil {
			handleError(c, err)
			return
		}
		response.OK(c, gin.H{"message": "Store item deleted"})
		return
	}

	item, err := h.service.DeactivateItem(c.Request.Context(), itemID)
	if err != nil {
		handleError(c, err)
		return
	}

	response.OK(c, gin.H{
		"message": "Store item deactivated",
		"item":    item,
	})
}

func requireAdmin(c *gin.Context) (int32, bool) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return 0, false
	}

	role, ok := middleware.GetUserRole(c)
	if !ok || role != "OPERATOR" {
		response.Err(c, 403, "AUTH_FORBIDDEN", "Only operator accounts can manage store items")
		return 0, false
	}

	return userID, true
}

func parseID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid item ID")
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
