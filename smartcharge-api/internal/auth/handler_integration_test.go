package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

type testEnvelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func setupAuthRouter(db generated.DBTX, secret []byte) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	queries := generated.New(db)
	service := NewService(queries, secret)
	handler := NewHandler(service)
	v1 := router.Group("/v1")
	handler.RegisterRoutes(v1)
	return router
}

func TestLoginSuccess(t *testing.T) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("demo123"), 10)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM users WHERE email = $1"):
				return testutil.NewRow(
					int32(1),
					"Demo User",
					"driver@test.com",
					string(hashedPassword),
					"DRIVER",
					int32(150),
					12.5,
					int32(300),
					nil,
					nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			switch {
			case strings.Contains(sql, "FROM badges b"):
				return testutil.NewRows([]any{int32(10), "Gece Kusu", "Night charger", "moon"}), nil
			case strings.Contains(sql, "FROM stations"):
				return testutil.NewRows([]any{int32(21), "Demo Station", 7.5, 38.61, 27.40}), nil
			default:
				return testutil.NewRows(), nil
			}
		},
	}

	router := setupAuthRouter(db, []byte("test-secret"))
	body := bytes.NewBufferString(`{"email":"driver@test.com","password":"demo123"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var envelope testEnvelope
	if err := json.Unmarshal(w.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !envelope.Success {
		t.Fatalf("expected success response, got %+v", envelope.Error)
	}

	var authResp AuthResponse
	if err := json.Unmarshal(envelope.Data, &authResp); err != nil {
		t.Fatalf("failed to decode auth response: %v", err)
	}
	if authResp.Token == "" {
		t.Fatal("expected JWT token to be present")
	}
	if authResp.User.Email != "driver@test.com" {
		t.Fatalf("expected normalized email in response, got %s", authResp.User.Email)
	}
	if len(authResp.User.Badges) != 1 || len(authResp.User.Stations) != 1 {
		t.Fatalf("expected badges and stations to be included, got %+v", authResp.User)
	}
}

func TestLoginInvalidPassword(t *testing.T) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("demo123"), 10)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			if strings.Contains(sql, "FROM users WHERE email = $1") {
				return testutil.NewRow(
					int32(1), "Demo User", "driver@test.com", string(hashedPassword),
					"DRIVER", int32(0), 0.0, int32(0), nil, nil,
				)
			}
			return testutil.NewRowError(pgx.ErrNoRows)
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	router := setupAuthRouter(db, []byte("test-secret"))
	body := bytes.NewBufferString(`{"email":"driver@test.com","password":"wrongpass"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRegisterAssignsOperatorRoleByDomain(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM users WHERE email = $1"):
				return testutil.NewRowError(pgx.ErrNoRows)
			case strings.Contains(sql, "INSERT INTO users"):
				return testutil.NewRow(
					int32(2),
					"Operator",
					"ops@zorlu.com",
					"hashed",
					"OPERATOR",
					int32(0),
					0.0,
					int32(0),
					nil,
					nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	router := setupAuthRouter(db, []byte("test-secret"))
	body := bytes.NewBufferString(`{"name":"Operator","email":"ops@zorlu.com","password":"secret12"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var envelope testEnvelope
	if err := json.Unmarshal(w.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	var authResp AuthResponse
	if err := json.Unmarshal(envelope.Data, &authResp); err != nil {
		t.Fatalf("failed to decode auth response: %v", err)
	}
	if authResp.User.Role != "OPERATOR" {
		t.Fatalf("expected operator role, got %s", authResp.User.Role)
	}
}
