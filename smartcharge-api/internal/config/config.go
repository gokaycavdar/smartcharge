package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	GinMode     string
	FrontendURL string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "default-dev-secret"),
		Port:        getEnv("PORT", "8080"),
		GinMode:     getEnv("GIN_MODE", "debug"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
