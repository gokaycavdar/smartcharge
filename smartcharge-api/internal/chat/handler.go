package chat

import (
	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for the chat endpoint.
type Handler struct {
	service *Service
}

// NewHandler creates a new chat handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers chat routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/chat", h.Chat)
}

// Chat handles POST /v1/chat.
// Stub: ignores the message body, returns static Turkish response + 3 station recommendations.
func (h *Handler) Chat(c *gin.Context) {
	// We accept the body but don't use it (stub)
	_ = c.Request.Body

	result, err := h.service.Chat(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// --- helpers ---

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "AI servisi şu an yanıt veremiyor.")
}
