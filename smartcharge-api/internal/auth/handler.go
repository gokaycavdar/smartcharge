package auth

import (
	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for authentication.
type Handler struct {
	service *Service
}

// NewHandler creates a new auth handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers auth routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/login", h.Login)
	auth.POST("/register", h.Register)
}

// Login handles POST /v1/auth/login.
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Email and password are required")
		return
	}

	result, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
			return
		}
		response.Err(c, 500, "INTERNAL_ERROR", "Login failed")
		return
	}

	response.OK(c, result)
}

// Register handles POST /v1/auth/register.
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Name, email, and password (min 6 chars) are required")
		return
	}

	result, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		if appErr, ok := err.(*apperrors.AppError); ok {
			response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
			return
		}
		response.Err(c, 500, "INTERNAL_ERROR", "Registration failed")
		return
	}

	response.Created(c, result)
}
