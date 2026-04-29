package chat

import (
	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// ChatRequest is the request body for the chat endpoint.
type ChatRequest struct {
	Message   string `json:"message" binding:"required"`
	StationID *int32 `json:"stationId,omitempty"`
	Date      string `json:"date,omitempty"`
	Hour      string `json:"hour,omitempty"`
	IsGreen   *bool  `json:"isGreen,omitempty"`
}

type ExecuteActionRequest struct {
	Type      string `json:"type" binding:"required"`
	Label     string `json:"label,omitempty"`
	StationID *int32 `json:"stationId,omitempty"`
	Date      string `json:"date,omitempty"`
	Hour      string `json:"hour,omitempty"`
	IsGreen   *bool  `json:"isGreen,omitempty"`
	URL       string `json:"url,omitempty"`
	Style     string `json:"style,omitempty"`
}

// Handler handles HTTP requests for the chat endpoint.
type Handler struct {
	service *Service
}

// NewHandler creates a new chat handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers chat routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	chat := rg.Group("/chat")
	chat.Use(authMiddleware)
	chat.POST("", h.Chat)
	chat.POST("/actions/execute", h.ExecuteAction)
}

// Chat handles POST /v1/chat.
func (h *Handler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Mesaj alanı zorunludur")
		return
	}

	// Extract userID from JWT
	userID, exists := middleware.GetUserID(c)
	if !exists {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	result, err := h.service.Chat(c.Request.Context(), userID, req.Message, req.StationID, req.Date, req.Hour, req.IsGreen)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// ExecuteAction handles POST /v1/chat/actions/execute.
func (h *Handler) ExecuteAction(c *gin.Context) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req ExecuteActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "type alani zorunludur")
		return
	}

	action := &Action{
		Type:      req.Type,
		Label:     req.Label,
		StationID: req.StationID,
		Date:      req.Date,
		Hour:      req.Hour,
		IsGreen:   req.IsGreen,
		URL:       req.URL,
		Style:     req.Style,
	}

	result, err := h.service.ExecuteAction(c.Request.Context(), userID, action)
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
