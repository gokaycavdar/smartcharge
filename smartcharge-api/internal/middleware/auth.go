package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"smartcharge-api/internal/response"
)

type contextKey string

const (
	// ContextUserID is the key for the authenticated user's ID in the Gin context.
	ContextUserID contextKey = "userID"
	// ContextUserRole is the key for the authenticated user's role in the Gin context.
	ContextUserRole contextKey = "userRole"
)

// AuthRequired returns a Gin middleware that validates JWT tokens.
func AuthRequired(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Err(c, http.StatusUnauthorized, "AUTH_UNAUTHORIZED", "Authorization header required")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			response.Err(c, http.StatusUnauthorized, "AUTH_UNAUTHORIZED", "Invalid authorization format. Use: Bearer <token>")
			return
		}

		tokenString := parts[1]
		claims := jwt.MapClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			response.Err(c, http.StatusUnauthorized, "AUTH_UNAUTHORIZED", "Invalid or expired token")
			return
		}

		// Extract user ID and role from claims
		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			response.Err(c, http.StatusUnauthorized, "AUTH_UNAUTHORIZED", "Invalid token claims")
			return
		}

		role, _ := claims["role"].(string)

		c.Set(string(ContextUserID), int32(userIDFloat))
		c.Set(string(ContextUserRole), role)

		c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from the Gin context.
func GetUserID(c *gin.Context) (int32, bool) {
	val, exists := c.Get(string(ContextUserID))
	if !exists {
		return 0, false
	}
	id, ok := val.(int32)
	return id, ok
}

// GetUserRole extracts the authenticated user's role from the Gin context.
func GetUserRole(c *gin.Context) (string, bool) {
	val, exists := c.Get(string(ContextUserRole))
	if !exists {
		return "", false
	}
	role, ok := val.(string)
	return role, ok
}
