package demouser

import (
	"github.com/gin-gonic/gin"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for the demo-user endpoint.
type Handler struct {
	queries *generated.Queries
}

// NewHandler creates a new demo-user handler.
func NewHandler(queries *generated.Queries) *Handler {
	return &Handler{queries: queries}
}

// RegisterRoutes registers the demo-user route on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/demo-user", h.GetDemoUser)
}

// GetDemoUser handles GET /v1/demo-user.
// Returns the seeded driver user (driver@test.com).
func (h *Handler) GetDemoUser(c *gin.Context) {
	user, err := h.queries.GetDemoUser(c.Request.Context())
	if err != nil {
		response.Err(c, 404, "RESOURCE_NOT_FOUND", "Demo kullanıcı bulunamadı. Lütfen seed script'i çalıştırın.")
		return
	}

	response.OK(c, gin.H{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		"role":  user.Role,
	})
}
