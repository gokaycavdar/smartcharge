package station

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

func setupStationRouter(service *Service) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewHandler(service, nil, generated.New(&testutil.FakeDB{}))
	v1 := router.Group("/v1")
	handler.RegisterRoutes(v1, func(c *gin.Context) {
		c.Set("userID", int32(1))
		c.Next()
	})
	return router
}

func TestListStationsHandlerSuccess(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM stations s") {
				return testutil.NewRows(
					[]any{int32(1), "Central Hub", 38.61, 27.40, 8.5, int32(20), pgtype.Int4{}, pgtype.Text{}, "central", pgtype.Text{}},
				), nil
			}
			return testutil.NewRows(), nil
		},
	}

	router := setupStationRouter(NewService(generated.New(db)))
	req := httptest.NewRequest(http.MethodGet, "/v1/stations", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetForecastsHandlerSuccess(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM station_density_forecasts f") {
				return testutil.NewRows(
					[]any{int32(1), int32(7), int32(2), int32(14), int32(30), "Downtown", 38.61, 27.40, 8.5, pgtype.Text{}, "central"},
				), nil
			}
			return testutil.NewRows(), nil
		},
	}

	router := setupStationRouter(NewService(generated.New(db)))
	req := httptest.NewRequest(http.MethodGet, "/v1/stations/forecast?day=2&hour=14", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateStationHandlerSuccess(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			if strings.Contains(sql, "INSERT INTO stations") {
				return testutil.NewRow(
					int32(11), "Fresh Station", 38.50, 27.20, pgtype.Text{String: "New Address", Valid: true},
					9.0, int32(0), pgtype.Int4{Int32: 1, Valid: true}, "NORMAL", int32(4), "qr-secret",
				)
			}
			return testutil.NewRowError(pgx.ErrNoRows)
		},
	}

	router := setupStationRouter(NewService(generated.New(db)))
	body := bytes.NewBufferString(`{"name":"Fresh Station","latitude":38.5,"longitude":27.2,"address":"New Address","price":9}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/stations", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateStationHandlerRejectsInvalidID(t *testing.T) {
	router := setupStationRouter(NewService(generated.New(&testutil.FakeDB{})))
	body := bytes.NewBufferString(`{"name":"Fresh Station","latitude":38.5,"longitude":27.2,"price":9}`)
	req := httptest.NewRequest(http.MethodPut, "/v1/stations/not-a-number", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
