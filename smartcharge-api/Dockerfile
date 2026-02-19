# ── Stage 1: Build ────────────────────────────────────
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# ── Stage 2: Runtime ─────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata curl

WORKDIR /app

# Copy binary from builder
COPY --from=builder /server /app/server

# Copy migrations (needed for golang-migrate at startup)
COPY --from=builder /app/db/migrations /app/db/migrations

# Copy seed script source is NOT included — seed runs as a separate step
# Copy .env.example as reference (actual env comes from docker-compose)
COPY --from=builder /app/.env.example /app/.env.example

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/server"]
