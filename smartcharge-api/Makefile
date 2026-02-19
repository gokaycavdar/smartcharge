.PHONY: run build sqlc migrate-up migrate-down migrate-create seed tidy

# Run the server
run:
	go run ./cmd/server

# Build binary
build:
	CGO_ENABLED=0 go build -o bin/server ./cmd/server

# Generate SQLC code
sqlc:
	sqlc generate -f db/sqlc.yaml

# Run migrations up
migrate-up:
	migrate -database "$(DATABASE_URL)" -path db/migrations up

# Run migrations down
migrate-down:
	migrate -database "$(DATABASE_URL)" -path db/migrations down

# Create a new migration (usage: make migrate-create name=add_something)
migrate-create:
	migrate create -ext sql -dir db/migrations -seq $(name)

# Seed the database
seed:
	go run ./scripts/seed.go

# Tidy dependencies
tidy:
	go mod tidy
