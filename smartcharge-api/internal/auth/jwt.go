package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken creates a new JWT token for the given user.
func GenerateToken(userID int32, role string, secret []byte) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// ParseToken validates and parses a JWT token string.
func ParseToken(tokenString string, secret []byte) (jwt.MapClaims, error) {
	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return secret, nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}
	return claims, nil
}
