package main

import (
	"log"
	"os"
	"os/exec"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	databaseURL := getEnv("DATABASE_URL", "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable")
	seedBinary := getEnv("SEED_BINARY", "/app/seed")

	log.Println("Release phase: applying migrations...")
	runMigrations(databaseURL)

	log.Println("Release phase: resetting and seeding database...")
	cmd := exec.Command(seedBinary)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	if err := cmd.Run(); err != nil {
		log.Fatalf("Release phase failed while running seed binary: %v", err)
	}

	log.Println("Release phase completed successfully.")
}

func runMigrations(databaseURL string) {
	m, err := migrate.New("file://db/migrations", databaseURL)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Migration failed: %v", err)
	}

	version, dirty, _ := m.Version()
	if dirty {
		log.Fatalf("Database is in dirty state at version %d. Manual intervention required.", version)
	}
	log.Printf("Migrations applied successfully (version: %d)", version)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
