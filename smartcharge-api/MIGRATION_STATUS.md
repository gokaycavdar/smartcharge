# SmartCharge Backend Migration Status

> **Purpose:** This file is the single source of truth for the JS→Go backend migration.
> At the start of every new session, read this file first to restore full context.
> Update this file after every completed phase.

---

## Goal

Migrate the entire backend of the EV charging ecosystem app ("SmartCharge") from JavaScript (Next.js/Node.js with Prisma ORM) to Go (Golang) with Clean Architecture. The Go backend lives at `smartcharge-api/` inside the existing `ev-hackathon/` repo. The Next.js frontend stays and will proxy API calls to the Go backend.

## Key Decisions & Rules

- **Do NOT** perform a line-by-line conversion. Implement idiomatic Go using Clean Architecture (Handler/Service/Repository layers).
- **Tech stack:** Gin (HTTP), SQLC (DB code gen), pgx/v5 (PostgreSQL driver), golang-jwt/v5 (auth), bcrypt (passwords), godotenv (env), golang-migrate (migrations).
- **Auth:** Simple JWT, single token (no refresh), 24h expiry.
- **Docker:** Dev-friendly setup (multi-stage Dockerfile + docker-compose with Go API + PostgreSQL).
- **Frontend integration:** Proxy rewrite in `next.config.ts`: `/api/:path*` → `http://localhost:8080/v1/:path*`.
- **Unified JSON response:** All endpoints use `{ success: bool, data: {}, error: { code, message }, meta: {} }`.
- **Station load data:** Use `density` column from DB and `station_density_forecasts` table. NO random generators.
- **Operator stats:** Compute from real reservation data (SQL aggregates), not mock generators.
- **Leaderboard:** Real query `SELECT name, xp FROM users ORDER BY xp DESC LIMIT $1`.
- **Seed script:** Port `prisma/seed.ts` to Go, including linear regression forecasting (pure Go math).

### Response Format Strategy
- Go uses unified `{ success, data, error, meta }` wrapper — this is intentional and correct.
- JS returned raw objects — this is legacy behavior.
- Frontend will be updated in Phase 19 to unwrap `.data` from all responses.
- We do NOT change Go's response format to match JS. Frontend adapts to Go.

### Auth Strategy
- Go uses JWT — this is intentional and correct.
- Frontend will be updated in Phase 19 to send `Authorization: Bearer` headers.
- Frontend will stop sending `userId` in body/query params.
- We do NOT remove JWT from Go to match JS's lack of auth.

### Deprioritized (STUB only)
- **Chat module:** Simple interface + hardcoded response. Will be replaced with RAG later.
- **Campaign for-user endpoint:** Return all active campaigns without badge matching. Placeholder `matchedBadges: []`.

### Campaign discount stacking (KEPT)
Station detail endpoint queries active campaigns and applies their discount to slot prices. This is operator-created data, not user-facing badge matching.

---

## Discoveries (Reference)

### JS Codebase Analysis
- **17 route files, 23 HTTP handler methods** across 7 domains: Auth, Stations, Reservations, Campaigns, Users, Badges, Operator, Chat, Demo-user.
- **6 Prisma models:** User, Station, Reservation, Campaign, Badge, StationDensityForecast. Plus 2 M2M join tables: `user_badges`, `campaign_target_badges`.
- **No real auth in JS:** Login just checks credentials and returns user object. Frontend stores in localStorage. Go version adds proper JWT.
- **Heavy mock data in JS:** `lib/utils-ai.ts` has `MOCK_LEADERBOARD`, `generateDynamicTimeslots()` with random load. `lib/utils-operator-ai.ts` has random revenue/CO2/load generators. All replaced with real DB queries in Go.
- **OpenAI imported but NOT used** — chat endpoint is rule-based mock.
- **Seed file** uses `simple-statistics` library for linear regression. Creates 46 stations (Manisa, Turkey), 5 badges, 2 users (driver + operator), 4 campaigns, and 7,728 forecast records.
- **Station timeslot generation:** GREEN hours = 23-6. Green gets 20% price discount + 50 coins. Non-green gets 10 coins. Campaign discounts stack on top.
- **Reservation completion** uses Prisma `$transaction` → Go uses `pgx.BeginTx()`.
- **Pre-existing LSP error** in `app/(operator)/operator/stations/page.tsx` (missing `onSelect` prop on Map) — NOT related to our work, ignore it.

### SQLC Gotchas
- `owner_id` on stations is nullable (`pgtype.Int4`), so queries need `pgtype.Int4{Int32: value, Valid: true}`.
- `GetUserBadges` returns `[]generated.Badge` (not a custom Row type) because query selects exactly the badge columns.
- `GetUserStations` takes `pgtype.Int4` parameter (not `int32`).

### Business Logic Audit Summary

#### Confirmed Correct
- Auth: email normalization, bcrypt cost 10, default DRIVER, operator domain detection
- Station: GREEN 23-6, price 0.8x, coins 50/10, campaign stacking, 24h slots, "HH:00" format
- Reservation: coins 50/10, campaign stacking, PENDING default, CO2 2.5/0.5, atomic completion
- User: profile with badges/stations/last 10 reservations (DESC), self-only update

#### Intentional Improvements (keep as-is)
- JWT auth (JS had none)
- userId from JWT (not request body)
- Profile update authorization
- Forecast-based load (not Math.random)
- Dedicated POST /complete endpoint
- Leaderboard endpoint (new feature)

---

## Phase Status

### ✅ Phase 1: Project Scaffolding
- `go.mod`, directory structure, `Makefile`, `.env.example`, `.env`, `db/sqlc.yaml`

### ✅ Phase 2: Database Layer
- `000001_init_schema.up.sql` (7 tables + indexes), `down.sql`
- 6 SQLC query files: `users.sql`, `stations.sql`, `reservations.sql`, `campaigns.sql`, `badges.sql`, `forecasts.sql`
- SQLC code generation → 8 files in `db/generated/`

### ✅ Phase 3: Core Infrastructure
- `config/config.go`, `response/response.go`, `errors/errors.go`, `middleware/auth.go`, `middleware/cors.go`

### ✅ Phase 4: Auth Module
- `auth/dto.go`, `auth/jwt.go`, `auth/handler.go`, `auth/service.go`
- 2 LSP errors fixed: `GetUserBadgesRow` → `Badge`, `user.ID` → `pgtype.Int4{...}`
- Endpoints: `POST /v1/auth/login`, `POST /v1/auth/register`

### ✅ Phase 5: Station Module
- `station/dto.go`, `station/service.go`, `station/handler.go`
- Endpoints: `GET /v1/stations`, `GET /v1/stations/:id` (24h timeslots + campaign stacking + forecast load), `POST /v1/stations`, `PUT /v1/stations/:id`, `GET /v1/stations/forecast`
- Uses `GetActiveCampaignsForStation` with `pgtype.Int4` for station-specific + global campaigns
- Forecast load from `station_density_forecasts`, fallback to `station.Density`
- `parseDiscountRate()` helper parses "%20" → 0.20

### ✅ Phase 6: Reservation Module
- `reservation/dto.go`, `reservation/service.go`, `reservation/handler.go`
- Endpoints: `POST /v1/reservations` (create with campaign coin bonus), `PATCH /v1/reservations/:id` (update status), `POST /v1/reservations/:id/complete` (atomic transaction)
- Service takes `*pgxpool.Pool` for transaction support: `pool.BeginTx()` + `queries.WithTx(tx)`
- Complete endpoint atomically: updates reservation status to COMPLETED + increments user coins/xp/co2
- `go get github.com/jackc/puddle/v2@v2.2.2` was needed for pgxpool dependency

### ✅ Phase 7: User Module
- `user/dto.go`, `user/service.go`, `user/handler.go`
- Endpoints: `GET /v1/users/:id` (profile with badges/stations/last 10 reservations), `PUT /v1/users/:id` (update name/email, self-only), `GET /v1/users/leaderboard`
- Leaderboard is real DB query (not mock data): `GetLeaderboard(ctx, limit)`
- Profile update enforces `userID == id` check

### ✅ Phase 8: Badge Module + Bug Fixes
- `badge/service.go`, `badge/handler.go`
- Endpoint: `GET /v1/badges` — list all badges, sorted by name ASC (no auth required)
- **Bug fix:** `reservation/service.go` — XP changed from 50 to 100
- **Security fix:** `reservation/service.go` — removed `CompleteRequest` client override of earnedCoins/XP; coins always come from stored reservation, XP is always 100
- `go build ./...` passes cleanly

### ✅ Phase 9: Campaign Module — Operator CRUD
- `campaign/dto.go`, `campaign/service.go`, `campaign/handler.go`
- Endpoints (all require auth):
  - `GET /v1/campaigns?ownerId=X` — list by owner with station name (JOIN) + target badges per campaign, ordered by createdAt DESC
  - `POST /v1/campaigns` — create with optional `targetBadgeIds` array, coinReward defaults 0, endDate parsed or null, ownerID from JWT
  - `PUT /v1/campaigns/:id` — 2-step: disconnect all badges via `RemoveCampaignTargetBadges`, then `UpdateCampaign` + reconnect new badges
  - `DELETE /v1/campaigns/:id` — removes badge links first (FK), then deletes campaign
- Two helper functions: `campaignRowToResponse` (from ListCampaignsByOwnerRow) and `campaignToResponse` (from Campaign model)
- `go build ./...` passes cleanly

### ✅ Phase 10: Campaign for-user STUB
- Added to existing `campaign/service.go` and `campaign/handler.go`
- Endpoint: `GET /v1/campaigns/for-user` — returns all active campaigns via `ListActiveCampaigns` SQLC query
- Stub: `matchedBadges: []` placeholder. Can upgrade to real badge matching later.
- Route registered before `/:id` routes to avoid Gin param collision

### ✅ Phase 11: Operator Module
- `operator/dto.go`, `operator/service.go`, `operator/handler.go`
- Endpoints (all require auth, ownerID from JWT):
  - `GET /v1/company/my-stations` — stations by owner + per-station stats (reservationCount, greenReservationCount, revenue, load, status) + aggregate stats (totalRevenue, totalReservations, greenShare, avgLoad)
  - `POST /v1/company/my-stations` — create station with ownerID from JWT
  - `PUT /v1/company/my-stations/:id` — partial update (optional fields with fallback to existing values)
  - `DELETE /v1/company/my-stations/:id` — delete with FK error handling
- Stats from real SQL queries: `GetStationReservationStats` (COUNT + green filter), `GetStationRevenue` (SUM with green × 0.8)
- Load from `station.Density` (not mock random), status from density thresholds (GREEN <43, YELLOW <69, RED >=69)
- `go build ./...` passes cleanly

### ✅ Phase 12: Chat Module STUB
- `internal/chat/service.go`, `internal/chat/handler.go`
- Endpoint: `POST /v1/chat` — accepts body (ignored), returns static Turkish response + 3 station recommendations
- Queries first 3 stations from `ListStations` for names, hardcoded hours 20:00/21:00/22:00, coins 50/60/70, isGreen: true
- No auth required (public endpoint)
- `go build ./...` passes cleanly

### ✅ Phase 13: Demo-user + Seed Script
- `internal/demouser/handler.go` — simple handler, no service layer (one query)
- Endpoint: `GET /v1/demo-user` — returns user with email `driver@test.com`, 404 if not seeded
- `scripts/seed.go` — standalone Go program:
  - Cleans all tables (respects FK order)
  - Creates 5 badges, 2 users (operator + driver with 4 badges)
  - Creates 46 stations (Manisa + İzmir) with density profiles
  - Generates 7,728 forecast records using pure Go linear regression (no external library)
  - Creates 4 badge-targeted campaigns
  - Updates station densities with weekly forecast averages
- `go build ./...` passes cleanly

### ✅ Phase 14: Main Server Entry Point
- `cmd/server/main.go` — full DI wiring, all route registration, DB pool, graceful shutdown
- Connects to PostgreSQL via pgxpool, initializes SQLC queries
- Creates all 9 services + handlers: auth, station, reservation, user, badge, campaign, operator, chat, demouser
- Registers all routes under `/v1` prefix
- Health check at `GET /health`
- Graceful shutdown with SIGINT/SIGTERM handling (5s timeout)
- **Server can now run with `go run ./cmd/server` or `make run`**
- `go build ./...` passes cleanly

### ✅ Phase 15: Docker
- `smartcharge-api/Dockerfile` — multi-stage build (golang:1.24-alpine builder → alpine:3.20 runtime)
  - Stage 1: dependency caching via `go mod download`, then `CGO_ENABLED=0` static binary build
  - Stage 2: minimal alpine with ca-certificates, tzdata, curl; copies binary + migrations
  - HEALTHCHECK on `/health` endpoint (30s interval)
- `smartcharge-api/.dockerignore` — excludes .env, bin/, scripts/, .md files, IDE config
- `docker-compose.yml` — updated with `api` service:
  - Builds from `./smartcharge-api` context
  - Environment variables for DATABASE_URL (uses `db` hostname), JWT_SECRET, PORT, GIN_MODE, FRONTEND_URL
  - `depends_on: db` with `condition: service_healthy` (waits for PostgreSQL healthcheck)
  - PostgreSQL service now has `pg_isready` healthcheck (5s interval, 10 retries)
  - `restart: unless-stopped` on API container
- `go build ./...` passes cleanly

### ✅ Phase 16: Frontend Proxy + E2E Verification
- `next.config.ts` — added `rewrites()` configuration:
  - `/api/:path*` → `http://localhost:8080/v1/:path*`
  - All frontend fetch calls to `/api/...` will be transparently proxied to Go backend
- E2E flow: `docker-compose up` starts PostgreSQL + Go API; `npm run dev` starts Next.js frontend
  - Frontend → `/api/auth/login` → proxy → `http://localhost:8080/v1/auth/login` → Go handler
  - Auth endpoints will work immediately; other endpoints may return auth errors until Phase 19 adds JWT headers
- **Go backend COMPLETE. Frontend phases begin.**

### ⏳ Phase 17: Frontend — Mock Data Removal
- `driver/page.tsx` → uncomment API call, remove generateDynamicTimeslots(), remove bestSlotPreview hack
- `driver/wallet/page.tsx` → remove MOCK_LEADERBOARD, call GET /v1/users/leaderboard
- `operator/page.tsx` → remove 6 mock generators, use real stats from my-stations API, remove hardcoded "Otowatt"
- `lib/utils-ai.ts` → remove mock exports (keep getDensityLevel, calculateGreenRewards)
- `lib/utils-operator-ai.ts` → delete entire file

### ⏳ Phase 18: Frontend — Hardcoded Values & UI Fixes
- `operator/stations/[id]/page.tsx` → remove hardcoded type/power/connectorType
- `components/Map.tsx` → remove station.id % 2 formulas
- `operator/campaigns/page.tsx` → remove mock AI recommendations section
- General → remove mockLoad/mockStatus references, use density/load from Go backend

### ⏳ Phase 19: Frontend — JWT Auth Integration
- `app/page.tsx` → parse token from login/register response, store in localStorage
- Create `lib/auth.ts` utility → authFetch() wrapper with Authorization: Bearer header
- Update ALL fetch calls (12+ files) to use authFetch
- Update ALL response parsing to unwrap `.data` from unified response wrapper
- Remove userId body/query params from: reservation create, campaigns for-user, my-stations
- Change reservation completion: PATCH "COMPLETED" → POST /complete
- Token expiry handling → redirect to login

---

## File Map

### Go Backend (`smartcharge-api/`)

#### Config & Build
- `go.mod`, `go.sum`, `.env`, `.env.example`, `Makefile`
- `Dockerfile` — multi-stage build (builder + runtime)
- `.dockerignore` — excludes dev/build artifacts

#### Database
- `db/sqlc.yaml`
- `db/migrations/000001_init_schema.up.sql` (7 tables)
- `db/migrations/000001_init_schema.down.sql`
- `db/queries/users.sql` (11 queries)
- `db/queries/stations.sql` (7 queries)
- `db/queries/reservations.sql` (7 queries)
- `db/queries/campaigns.sql` (11 queries)
- `db/queries/badges.sql` (3 queries)
- `db/queries/forecasts.sql` (3 queries)
- `db/generated/` — 8 auto-generated files (DO NOT EDIT)

#### Internal Packages
- `internal/config/config.go` — env loading
- `internal/response/response.go` — unified JSON wrapper
- `internal/errors/errors.go` — AppError type + sentinels
- `internal/middleware/auth.go` — JWT middleware + GetUserID/GetUserRole helpers
- `internal/middleware/cors.go` — CORS middleware
- `internal/auth/` — dto.go, jwt.go, service.go, handler.go
- `internal/station/` — dto.go, service.go, handler.go
- `internal/reservation/` — dto.go, service.go, handler.go (service takes `*pgxpool.Pool`)
- `internal/user/` — dto.go, service.go, handler.go

- `internal/badge/` — service.go, handler.go
- `internal/campaign/` — dto.go, service.go, handler.go (includes for-user stub)
- `internal/operator/` — dto.go, service.go, handler.go
- `internal/chat/` — service.go, handler.go (stub)
- `internal/demouser/` — handler.go (no service layer)

#### Entry Point & Scripts
- `cmd/server/main.go` — DI wiring, route registration, DB pool, graceful shutdown
- `scripts/seed.go` — standalone seed program with linear regression forecasting

### JS Reference (DO NOT MODIFY except next.config.ts and docker-compose.yml)
- `prisma/schema.prisma`, `prisma/seed.ts`
- `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`
- `app/api/stations/route.ts`, `app/api/stations/[id]/route.ts`, `app/api/stations/forecast/route.ts`
- `app/api/reservations/route.ts`, `app/api/reservations/[id]/route.ts`, `app/api/reservations/[id]/complete/route.ts`
- `app/api/campaigns/route.ts`, `app/api/campaigns/[id]/route.ts`, `app/api/campaigns/for-user/route.ts`
- `app/api/badges/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/company/my-stations/route.ts`, `app/api/company/my-stations/[id]/route.ts`
- `app/api/chat/route.ts`, `app/api/demo-user/route.ts`
- `lib/utils-ai.ts`, `lib/utils-operator-ai.ts`
- `docker-compose.yml` (MODIFIED in Phase 15 — added `api` service with healthcheck dependency)
- `next.config.ts` (MODIFIED in Phase 16 — added proxy rewrite `/api/:path*` → Go backend)

### Frontend Files (Modified in Phases 17-19)
- `app/(driver)/driver/page.tsx` — Phase 17 (mock removal)
- `app/(driver)/driver/wallet/page.tsx` — Phase 17 (mock leaderboard)
- `app/(operator)/operator/page.tsx` — Phase 17 (mock generators)
- `lib/utils-ai.ts` — Phase 17 (mock exports)
- `lib/utils-operator-ai.ts` — Phase 17 (delete entire file)
- `app/(operator)/operator/stations/[id]/page.tsx` — Phase 18 (hardcoded values)
- `components/Map.tsx` — Phase 18 (id % 2 formulas)
- `app/(operator)/operator/campaigns/page.tsx` — Phase 18 (mock AI)
- `app/page.tsx` — Phase 19 (JWT token handling)
- `lib/auth.ts` — Phase 19 (new file: authFetch utility)
- 12+ fetch call files — Phase 19 (authFetch + response unwrapping)

---

## Session Notes

- **Pattern:** Handler calls Service, Service calls SQLC Queries. No repository layer — SQLC is the repository.
- **Auth middleware:** Sets `userID` (int32) and `userRole` (string) in Gin context. Extract via `middleware.GetUserID(c)`.
- **Error handling pattern:** Service returns `*apperrors.AppError`, handler checks with type assertion. Use struct literal `&apperrors.AppError{...}` for one-off errors (no `NewAppError` constructor).
- **Route registration pattern:** `handler.RegisterRoutes(v1Group, authMiddleware)` — each handler owns its route group.
- **Gin route ordering:** Named routes (e.g. `/for-user`) must be registered before parameterized routes (`/:id`) to avoid collision.
- **Nullable columns:** Always use `pgtype.Int4` / `pgtype.Text` for nullable DB columns. Convert to Go `*int32` / `*string` in DTOs.
- **Transaction pattern:** Service receives `*pgxpool.Pool`, calls `pool.BeginTx()`, then `queries.WithTx(tx)` for transactional queries. Always `defer tx.Rollback(ctx)` before operations.
- **Operator stats:** Density thresholds: GREEN <43, YELLOW <69, RED >=69. Revenue = SUM(price * (isGreen ? 0.8 : 1.0)).
- **`go build ./...` passes cleanly** as of end of this session — all packages compile.
- **Server is runnable** with `go run ./cmd/server` or `make run` — requires PostgreSQL running.
- **Seed script** runs with `go run ./scripts/seed.go` or `make seed` — populates all tables.
- **Docker:** `docker-compose up` starts PostgreSQL (with healthcheck) + Go API. API waits for DB to be ready via `depends_on: condition: service_healthy`. DB connection uses hostname `db` (Docker network), not `localhost`.
- **Frontend proxy:** `next.config.ts` rewrites `/api/:path*` → `http://localhost:8080/v1/:path*`. Frontend fetch calls to `/api/...` are transparently proxied. Works with both local dev (`make run`) and Docker (`docker-compose up`).
- **Migrations need manual run:** After `docker-compose up`, run `migrate -database "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable" -path smartcharge-api/db/migrations up` and then seed. Alternative: run seed script which can also create tables.
- **Go backend is COMPLETE** as of Phase 16. Remaining phases 17-19 are frontend-only.

---

## Remaining Session Plan

| Session | Phases | What |
|---------|--------|------|
| Next | 17 + 18 + 19 | All frontend work in one pass |
