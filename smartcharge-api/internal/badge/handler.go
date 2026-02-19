package badge

import (
	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for badges.
type Handler struct {
	service *Service
}

// NewHandler creates a new badge handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers badge routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	badges := rg.Group("/badges")

	badges.GET("", h.List)
}

// List handles GET /v1/badges.
func (h *Handler) List(c *gin.Context) {
	badges, err := h.service.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, badges)
}

// --- helpers ---

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "An unexpected error occurred")
}
