package reservation

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

type reservationEnvelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
}

func setupReservationRouter(service *Service) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewHandler(service)
	v1 := router.Group("/v1")
	handler.RegisterRoutes(v1, func(c *gin.Context) {
		c.Set("userID", int32(1))
		c.Next()
	})
	return router
}

func TestCreateHandlerSuccess(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(9), "Central Station", 38.61, 27.40, pgtype.Text{String: "Address", Valid: true},
					8.5, int32(30), pgtype.Int4{}, "central", int32(4), "qr-secret",
				)
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "user_id = $1"):
				return testutil.NewRow(int32(0))
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "station_id = $1"):
				return testutil.NewRow(int32(0))
			case strings.Contains(sql, "INSERT INTO reservations"):
				return testutil.NewRow(
					int32(77), int32(1), int32(9), args[2], args[3], args[4], args[5],
					0.0, StatusPending, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	service := &Service{queries: generated.New(db), pool: &testutil.FakePool{}}
	router := setupReservationRouter(service)

	body := bytes.NewBufferString(`{"stationId":9,"date":"2099-01-01","hour":"14:00"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/reservations", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateStatusHandlerRejectsInvalidID(t *testing.T) {
	service := &Service{queries: generated.New(&testutil.FakeDB{}), pool: &testutil.FakePool{}}
	router := setupReservationRouter(service)

	body := bytes.NewBufferString(`{"status":"CANCELLED"}`)
	req := httptest.NewRequest(http.MethodPatch, "/v1/reservations/not-a-number", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCompleteHandlerSuccess(t *testing.T) {
	now := time.Now().UTC()
	tx := &testutil.FakeTx{
		QueryRowFn: func(_ context.Context, sql string, args ...any) pgx.Row {
			switch {
			case strings.Contains(sql, "SET status = 'COMPLETED'"):
				return testutil.NewRow(
					int32(88), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "23:00", true, int32(50),
					2.5, StatusCompleted, nil, nil, nil, nil, pgtype.Timestamptz{Time: now, Valid: true}, nil, nil, nil,
				)
			case strings.Contains(sql, "UPDATE users") && strings.Contains(sql, "SET coins = coins +"):
				return testutil.NewRow(
					int32(1), "Demo User", "driver@test.com", "hashed", "DRIVER",
					int32(250), 3.0, int32(900), nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			if strings.Contains(sql, "FROM reservations WHERE id = $1") {
				return testutil.NewRow(
					int32(88), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "23:00", true, int32(50),
					0.0, StatusCharging, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			}
			return testutil.NewRowError(pgx.ErrNoRows)
		},
	}

	service := &Service{
		queries: generated.New(db),
		pool: &testutil.FakePool{
			BeginTxFn: func(context.Context, pgx.TxOptions) (pgx.Tx, error) { return tx, nil },
		},
	}
	router := setupReservationRouter(service)

	req := httptest.NewRequest(http.MethodPost, "/v1/reservations/88/complete", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}
