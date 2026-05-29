package recommend

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

func TestScoreUsesForecastDataWhenAvailable(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			switch {
			case strings.Contains(sql, "FROM stations s"):
				return testutil.NewRows(
					[]any{int32(1), "Forecast Winner", 0.0, 0.0, 8.0, int32(90), pgtype.Int4{}, pgtype.Text{}, "central", pgtype.Text{}},
					[]any{int32(2), "Density Fallback", 0.0, 0.0, 8.0, int32(40), pgtype.Int4{}, pgtype.Text{}, "central", pgtype.Text{}},
				), nil
			case strings.Contains(sql, "FROM station_density_forecasts f"):
				return testutil.NewRows(
					[]any{int32(1), int32(1), int32(0), int32(14), int32(10), "Forecast Winner", 0.0, 0.0, 8.0, pgtype.Text{}, "central"},
				), nil
			default:
				return testutil.NewRows(), nil
			}
		},
	}

	scorer := NewRLScorer(generated.New(db))
	scorer.epsilon = 0

	results, err := scorer.Score(context.Background(), ScoreRequest{
		UserID:   1,
		UserLat:  0,
		UserLng:  0,
		TimeSlot: time.Date(2026, time.May, 25, 14, 0, 0, 0, time.UTC),
		Limit:    2,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].StationID != 1 {
		t.Fatalf("expected forecast-backed station to rank first, got station %d", results[0].StationID)
	}
}

func TestScoreFallsBackToStationDensityWhenForecastMissing(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			switch {
			case strings.Contains(sql, "FROM stations s"):
				return testutil.NewRows(
					[]any{int32(1), "Low Density", 0.0, 0.0, 8.0, int32(20), pgtype.Int4{}, pgtype.Text{}, "central", pgtype.Text{}},
					[]any{int32(2), "High Density", 0.0, 0.0, 8.0, int32(80), pgtype.Int4{}, pgtype.Text{}, "central", pgtype.Text{}},
				), nil
			case strings.Contains(sql, "FROM station_density_forecasts f"):
				return testutil.NewRows(), nil
			default:
				return testutil.NewRows(), nil
			}
		},
	}

	scorer := NewRLScorer(generated.New(db))
	scorer.epsilon = 0

	results, err := scorer.Score(context.Background(), ScoreRequest{
		UserID:   1,
		UserLat:  0,
		UserLng:  0,
		TimeSlot: time.Date(2026, time.May, 25, 14, 0, 0, 0, time.UTC),
		Limit:    2,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if results[0].StationID != 1 {
		t.Fatalf("expected low-density fallback station to rank first, got station %d", results[0].StationID)
	}
}
