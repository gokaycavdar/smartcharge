package station

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

func TestListStationsMapsOwnerAndStatus(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM stations s") {
				return testutil.NewRows(
					[]any{int32(1), "Central Hub", 38.61, 27.40, 8.555, int32(20), pgtype.Int4{Int32: 5, Valid: true}, pgtype.Text{String: "Address", Valid: true}, "central", pgtype.Text{String: "Zorlu", Valid: true}},
				), nil
			}
			return testutil.NewRows(), nil
		},
	}

	service := NewService(generated.New(db))
	items, err := service.ListStations(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].MockStatus != "GREEN" {
		t.Fatalf("expected GREEN status, got %s", items[0].MockStatus)
	}
	if items[0].Price != 8.56 {
		t.Fatalf("expected rounded price 8.56, got %.2f", items[0].Price)
	}
	if items[0].OwnerID == nil || *items[0].OwnerID != 5 {
		t.Fatalf("expected owner id 5, got %+v", items[0].OwnerID)
	}
}

func TestGetStationBuildsSlotsWithCampaignAndForecast(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(7), "Downtown", 38.61, 27.40, pgtype.Text{String: "Address", Valid: true},
					10.0, int32(35), pgtype.Int4{Int32: 2, Valid: true}, "central", int32(6), "qr-secret",
				)
			case strings.Contains(sql, "FROM station_density_forecasts"):
				hour := args[2].(int32)
				if hour == 10 {
					return testutil.NewRow(int32(70))
				}
				return testutil.NewRowError(pgx.ErrNoRows)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM campaigns") {
				return testutil.NewRows([]any{
					int32(3), "Green Bonus", "Campaign", "ACTIVE", "ALL", "%10",
					pgtype.Timestamptz{}, int32(2), pgtype.Int4{Int32: 7, Valid: true}, int32(5), nil, nil,
				}), nil
			}
			return testutil.NewRows(), nil
		},
	}

	service := NewService(generated.New(db))
	resp, err := service.GetStation(context.Background(), 7)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(resp.Slots) != 24 {
		t.Fatalf("expected 24 slots, got %d", len(resp.Slots))
	}
	if resp.ActiveCampaign == nil || resp.ActiveCampaign.Title != "Green Bonus" {
		t.Fatalf("expected active campaign to be attached, got %+v", resp.ActiveCampaign)
	}
	if resp.Slots[10].Load != 70 || resp.Slots[10].Status != "RED" {
		t.Fatalf("expected forecasted slot to use load 70/RED, got load=%d status=%s", resp.Slots[10].Load, resp.Slots[10].Status)
	}
	if !resp.Slots[23].IsGreen || resp.Slots[23].Coins != 55 || resp.Slots[23].Price != 7.2 {
		t.Fatalf("expected green slot with stacked discount and bonus, got %+v", resp.Slots[23])
	}
}

func TestCreateStationReturnsMappedResponse(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			if strings.Contains(sql, "INSERT INTO stations") {
				return testutil.NewRow(
					int32(11), "Fresh Station", 38.50, 27.20, pgtype.Text{String: "New Address", Valid: true},
					9.0, int32(0), pgtype.Int4{Int32: 4, Valid: true}, "NORMAL", int32(4), "qr-secret",
				)
			}
			return testutil.NewRowError(pgx.ErrNoRows)
		},
	}

	service := NewService(generated.New(db))
	resp, err := service.CreateStation(context.Background(), 4, CreateStationRequest{
		Name:      "Fresh Station",
		Latitude:  38.50,
		Longitude: 27.20,
		Address:   "New Address",
		Price:     9.0,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Name != "Fresh Station" || resp.Address == nil || *resp.Address != "New Address" {
		t.Fatalf("expected response to contain created station fields, got %+v", resp)
	}
}

func TestUpdateStationUpdatesExistingStation(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(11), "Old Station", 38.50, 27.20, pgtype.Text{String: "Old Address", Valid: true},
					9.0, int32(10), pgtype.Int4{Int32: 4, Valid: true}, "NORMAL", int32(4), "qr-secret",
				)
			case strings.Contains(sql, "UPDATE stations"):
				return testutil.NewRow(
					int32(11), "Updated Station", 39.00, 28.00, pgtype.Text{String: "Updated Address", Valid: true},
					11.0, int32(10), pgtype.Int4{Int32: 4, Valid: true}, "NORMAL", int32(4), "qr-secret",
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	service := NewService(generated.New(db))
	resp, err := service.UpdateStation(context.Background(), 11, UpdateStationRequest{
		Name:      "Updated Station",
		Latitude:  39.00,
		Longitude: 28.00,
		Address:   "Updated Address",
		Price:     11.0,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Name != "Updated Station" || resp.Price != 11.0 {
		t.Fatalf("expected updated station response, got %+v", resp)
	}
}

func TestGetForecastsMapsRows(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM station_density_forecasts f") {
				return testutil.NewRows(
					[]any{int32(1), int32(7), int32(2), int32(14), int32(30), "Downtown", 38.61, 27.40, 8.5, pgtype.Text{String: "Address", Valid: true}, "central"},
				), nil
			}
			return testutil.NewRows(), nil
		},
	}

	service := NewService(generated.New(db))
	resp, err := service.GetForecasts(context.Background(), 2, 14)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.CurrentTime.DayOfWeek != 2 || resp.CurrentTime.Hour != 14 {
		t.Fatalf("expected query time to be echoed back, got %+v", resp.CurrentTime)
	}
	if len(resp.Forecasts) != 1 || resp.Forecasts[0].PredictedLoad != 30 {
		t.Fatalf("expected mapped forecast row, got %+v", resp.Forecasts)
	}
}

func TestStationToResponseCarriesOptionalAddress(t *testing.T) {
	addr := "Response Address"
	resp := stationToResponse(generated.Station{
		ID:             5,
		Name:           "Response Station",
		Lat:            1,
		Lng:            2,
		Address:        pgtype.Text{String: addr, Valid: true},
		Price:          7.5,
		Density:        18,
		DensityProfile: "central",
	})

	if resp.Address == nil || *resp.Address != addr {
		t.Fatalf("expected address to be mapped, got %+v", resp)
	}
}

func TestGetStationUsesFallbackDensityWhenForecastMissing(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(7), "Downtown", 38.61, 27.40, pgtype.Text{},
					10.0, int32(44), pgtype.Int4{}, "central", int32(6), "qr-secret",
				)
			case strings.Contains(sql, "FROM station_density_forecasts"):
				return testutil.NewRowError(pgx.ErrNoRows)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	service := NewService(generated.New(db))
	resp, err := service.GetStation(context.Background(), 7)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Slots[12].Load != 44 || resp.Slots[12].Status != "GREEN" {
		t.Fatalf("expected fallback density to be used, got %+v", resp.Slots[12])
	}
}
