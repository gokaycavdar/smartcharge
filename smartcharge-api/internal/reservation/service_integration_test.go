package reservation

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/testutil"
)

func TestCreateSuccessAppliesCampaignBonusAndServerComputedGreenFlag(t *testing.T) {
	var insertedIsGreen bool
	var insertedCoins int32

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(9), "Night Station", 38.61, 27.40, pgtype.Text{String: "Test Address", Valid: true},
					8.5, int32(30), pgtype.Int4{}, "central", int32(4), "qr-secret",
				)
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "user_id = $1"):
				return testutil.NewRow(int32(0))
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "station_id = $1"):
				return testutil.NewRow(int32(0))
			case strings.Contains(sql, "INSERT INTO reservations"):
				insertedIsGreen = args[4].(bool)
				insertedCoins = args[5].(int32)
				return testutil.NewRow(
					int32(77), int32(1), int32(9), args[2], args[3], insertedIsGreen, insertedCoins,
					0.0, StatusPending, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			if strings.Contains(sql, "FROM campaigns") {
				return testutil.NewRows([]any{
					int32(3), "Night Bonus", "Campaign", "ACTIVE", "ALL", "%10",
					pgtype.Timestamptz{}, int32(2), pgtype.Int4{Int32: 9, Valid: true}, int32(15), nil, nil,
				}), nil
			}
			return testutil.NewRows(), nil
		},
	}

	service := &Service{
		queries: generated.New(db),
		pool:    &testutil.FakePool{},
	}

	resp, err := service.Create(context.Background(), 1, CreateReservationRequest{
		StationID: 9,
		Date:      time.Now().In(turkeyLocation).Add(24 * time.Hour).Format("2006-01-02"),
		Hour:      "23:00",
		IsGreen:   false,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !resp.IsGreen || !insertedIsGreen {
		t.Fatal("expected service to compute green charge from hour, not client payload")
	}
	if resp.EarnedCoins != 65 || insertedCoins != 65 {
		t.Fatalf("expected base green reward plus campaign bonus to equal 65, got response=%d inserted=%d", resp.EarnedCoins, insertedCoins)
	}
}

func TestCreateDuplicateBlocked(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(9), "Central Station", 38.61, 27.40, pgtype.Text{String: "Test Address", Valid: true},
					8.5, int32(30), pgtype.Int4{}, "central", int32(4), "qr-secret",
				)
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "user_id = $1"):
				return testutil.NewRow(int32(1))
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	service := &Service{
		queries: generated.New(db),
		pool:    &testutil.FakePool{},
	}

	_, err := service.Create(context.Background(), 1, CreateReservationRequest{
		StationID: 9,
		Date:      time.Now().In(turkeyLocation).Add(24 * time.Hour).Format("2006-01-02"),
		Hour:      "14:00",
	})
	if err == nil {
		t.Fatal("expected duplicate reservation to be rejected")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.StatusCode != 409 {
		t.Fatalf("expected conflict app error, got %#v", err)
	}
}

func TestCreateCapacityExceeded(t *testing.T) {
	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM stations WHERE id = $1"):
				return testutil.NewRow(
					int32(9), "Central Station", 38.61, 27.40, pgtype.Text{String: "Test Address", Valid: true},
					8.5, int32(30), pgtype.Int4{}, "central", int32(2), "qr-secret",
				)
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "user_id = $1"):
				return testutil.NewRow(int32(0))
			case strings.Contains(sql, "SELECT COUNT(*)::int FROM reservations") && strings.Contains(sql, "station_id = $1"):
				return testutil.NewRow(int32(2))
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
		QueryFn: func(_ context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
			return testutil.NewRows(), nil
		},
	}

	service := &Service{
		queries: generated.New(db),
		pool:    &testutil.FakePool{},
	}

	_, err := service.Create(context.Background(), 1, CreateReservationRequest{
		StationID: 9,
		Date:      time.Now().In(turkeyLocation).Add(24 * time.Hour).Format("2006-01-02"),
		Hour:      "14:00",
	})
	if err == nil {
		t.Fatal("expected full time slot to be rejected")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.StatusCode != 400 {
		t.Fatalf("expected validation app error, got %#v", err)
	}
}

func TestCompleteUpdatesCoinsXpAndCo2(t *testing.T) {
	now := time.Now().UTC()
	committed := false

	tx := &testutil.FakeTx{
		QueryRowFn: func(_ context.Context, sql string, args ...any) pgx.Row {
			switch {
			case strings.Contains(sql, "UPDATE reservations") && strings.Contains(sql, "SET status = 'COMPLETED'"):
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
		CommitFn: func(context.Context) error {
			committed = true
			return nil
		},
	}

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM reservations WHERE id = $1"):
				return testutil.NewRow(
					int32(88), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "23:00", true, int32(50),
					0.0, StatusCharging, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	pool := &testutil.FakePool{
		BeginTxFn: func(context.Context, pgx.TxOptions) (pgx.Tx, error) {
			return tx, nil
		},
	}

	service := &Service{
		queries: generated.New(db),
		pool:    pool,
	}

	resp, err := service.Complete(context.Background(), 88, 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !committed {
		t.Fatal("expected transaction to commit on successful completion")
	}
	if resp.Reservation.Status != StatusCompleted {
		t.Fatalf("expected reservation status COMPLETED, got %s", resp.Reservation.Status)
	}
	if resp.Reservation.SavedCo2 != 2.5 {
		t.Fatalf("expected green completion to save 2.5 CO2, got %.1f", resp.Reservation.SavedCo2)
	}
	if resp.User.Coins != 250 || resp.User.Co2Saved != 3.0 || resp.User.XP != 900 {
		t.Fatalf("expected updated user stats to be returned, got %+v", resp.User)
	}
}

func TestConfirmSuccess(t *testing.T) {
	now := time.Now().UTC()

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM reservations WHERE id = $1"):
				return testutil.NewRow(
					int32(31), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "14:00", false, int32(10),
					0.0, StatusPending, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			case strings.Contains(sql, "SET status = 'CONFIRMED'"):
				return testutil.NewRow(
					int32(31), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "14:00", false, int32(10),
					0.0, StatusConfirmed, nil, nil, pgtype.Timestamptz{Time: now, Valid: true}, nil, nil, nil, nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	service := &Service{queries: generated.New(db), pool: &testutil.FakePool{}}
	resp, err := service.Confirm(context.Background(), 31, 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Status != StatusConfirmed || resp.ConfirmedAt == nil {
		t.Fatalf("expected confirmed reservation response, got %+v", resp)
	}
}

func TestStartChargingSuccess(t *testing.T) {
	now := time.Now().UTC()

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			switch {
			case strings.Contains(sql, "FROM reservations WHERE id = $1"):
				return testutil.NewRow(
					int32(32), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "14:00", false, int32(10),
					0.0, StatusConfirmed, nil, nil, nil, nil, nil, nil, nil, nil,
				)
			case strings.Contains(sql, "SET status = 'CHARGING'"):
				return testutil.NewRow(
					int32(32), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "14:00", false, int32(10),
					0.0, StatusCharging, nil, nil, nil, pgtype.Timestamptz{Time: now, Valid: true}, nil, nil, nil, nil,
				)
			default:
				return testutil.NewRowError(pgx.ErrNoRows)
			}
		},
	}

	service := &Service{queries: generated.New(db), pool: &testutil.FakePool{}}
	resp, err := service.StartCharging(context.Background(), 32, 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Status != StatusCharging || resp.StartedAt == nil {
		t.Fatalf("expected charging reservation response, got %+v", resp)
	}
}

func TestUpdateStatusRejectsTerminalReservation(t *testing.T) {
	now := time.Now().UTC()

	db := &testutil.FakeDB{
		QueryRowFn: func(_ context.Context, sql string, args ...interface{}) pgx.Row {
			if strings.Contains(sql, "FROM reservations WHERE id = $1") {
				return testutil.NewRow(
					int32(33), int32(1), int32(9), pgtype.Timestamptz{Time: now, Valid: true}, "14:00", false, int32(10),
					0.5, StatusCompleted, nil, nil, nil, nil, pgtype.Timestamptz{Time: now, Valid: true}, nil, nil, nil,
				)
			}
			return testutil.NewRowError(pgx.ErrNoRows)
		},
	}

	service := &Service{queries: generated.New(db), pool: &testutil.FakePool{}}
	err := service.UpdateStatus(context.Background(), 33, 1, UpdateStatusRequest{Status: StatusCancelled})
	if err == nil {
		t.Fatal("expected terminal reservation update to fail")
	}

	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.StatusCode != 400 {
		t.Fatalf("expected validation error, got %#v", err)
	}
}
