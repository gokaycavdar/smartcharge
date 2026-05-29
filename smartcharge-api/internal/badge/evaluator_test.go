package badge

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/testutil"
)

func containsMetric(metrics []string, target string) bool {
	for _, metric := range metrics {
		if metric == target {
			return true
		}
	}
	return false
}

func TestMatchMetricsNightGreenWeekendMorningOutskirt(t *testing.T) {
	event := Event{
		IsGreen:        true,
		Hour:           6,
		DayOfWeek:      6,
		DensityProfile: "outskirt",
	}

	metrics := matchMetrics(event)
	expected := []string{
		"night_charges",
		"green_charges",
		"weekend_charges",
		"morning_charges",
		"intercity_charges",
	}

	for _, metric := range expected {
		if !containsMetric(metrics, metric) {
			t.Fatalf("expected metric %q to be present in %v", metric, metrics)
		}
	}
}

func TestMatchMetricsNonMatchingEvent(t *testing.T) {
	event := Event{
		IsGreen:        false,
		Hour:           14,
		DayOfWeek:      3,
		DensityProfile: "suburban",
	}

	metrics := matchMetrics(event)
	if len(metrics) != 0 {
		t.Fatalf("expected no metrics, got %v", metrics)
	}
}

func TestMatchMetricsMorningWithoutNightAtBoundary(t *testing.T) {
	event := Event{
		IsGreen:   false,
		Hour:      9,
		DayOfWeek: 2,
	}

	metrics := matchMetrics(event)
	if !containsMetric(metrics, "morning_charges") {
		t.Fatalf("expected morning metric, got %v", metrics)
	}
	if containsMetric(metrics, "night_charges") {
		t.Fatalf("did not expect night metric, got %v", metrics)
	}
}

func TestEvaluateAwardsBadgeWhenThresholdReached(t *testing.T) {
	awardedCalled := false

	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM badge_criteria bc") {
				return testutil.NewRows(
					[]any{int32(1), int32(9), "green_charges", int32(3), "all_time", "Green Hero", "Desc", "leaf"},
				), nil
			}
			return testutil.NewRows(), nil
		},
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "SELECT COUNT(*) FROM user_badges"):
				return testutil.NewRow(int64(0))
			case strings.Contains(sql, "INSERT INTO badge_progress"):
				return testutil.NewRow(int32(5), int32(9), "green_charges", int32(3), pgtype.Timestamptz{})
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		ExecFn: func(_ context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error) {
			if strings.Contains(sql, "INSERT INTO user_badges") {
				awardedCalled = true
			}
			return pgconn.CommandTag{}, nil
		},
	}

	evaluator := NewEvaluator()
	awarded, err := evaluator.Evaluate(context.Background(), generated.New(db), Event{
		UserID:    5,
		IsGreen:   true,
		Hour:      23,
		DayOfWeek: 2,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !awardedCalled || len(awarded) != 1 || awarded[0].Name != "Green Hero" {
		t.Fatalf("expected badge to be awarded, got %+v", awarded)
	}
}

func TestEvaluateSkipsWhenNoMetricsMatch(t *testing.T) {
	db := &testutil.FakeDB{
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	evaluator := NewEvaluator()
	awarded, err := evaluator.Evaluate(context.Background(), generated.New(db), Event{
		UserID:         5,
		IsGreen:        false,
		Hour:           14,
		DayOfWeek:      2,
		DensityProfile: "urban",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(awarded) != 0 {
		t.Fatalf("expected no awarded badges, got %+v", awarded)
	}
}
