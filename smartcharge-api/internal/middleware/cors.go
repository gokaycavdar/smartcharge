package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS returns a Gin middleware that handles Cross-Origin Resource Sharing.
func CORS(frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		// Allow the configured frontend URL and common dev origins
		allowedOrigins := map[string]bool{
			frontendURL:             true,
			"http://localhost:3000": true,
			"http://localhost:3001": true,
		}

		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
