package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestProtectedEndpointWithoutTokenReturns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/private", AuthRequired([]byte("test-secret")), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestProtectedEndpointRejectsInvalidAuthorizationFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/private", AuthRequired([]byte("test-secret")), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set("Authorization", "Token abc")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestProtectedEndpointRejectsInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/private", AuthRequired([]byte("test-secret")), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set("Authorization", "Bearer definitely-not-a-jwt")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestProtectedEndpointAcceptsValidTokenAndStoresClaims(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.GET("/private", AuthRequired([]byte("test-secret")), func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok || userID != 42 {
			t.Fatalf("expected user id 42 in context, got %d ok=%v", userID, ok)
		}

		role, ok := GetUserRole(c)
		if !ok || role != "OPERATOR" {
			t.Fatalf("expected role OPERATOR in context, got %q ok=%v", role, ok)
		}

		c.Status(http.StatusOK)
	})

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": float64(42),
		"role":    "OPERATOR",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	signed, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/private", nil)
	req.Header.Set("Authorization", "Bearer "+signed)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
