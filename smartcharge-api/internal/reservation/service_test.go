package reservation

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
)

func makeQRPayload(stationID int32, secret string, ts time.Time) string {
	message := fmt.Sprintf("%d:%d", stationID, ts.Unix())
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	return fmt.Sprintf("SCCHK:%d:%d:%s", stationID, ts.Unix(), hex.EncodeToString(mac.Sum(nil)))
}

func TestParseHourFromString(t *testing.T) {
	hour, err := parseHourFromString("14:00")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if hour != 14 {
		t.Fatalf("expected hour 14, got %d", hour)
	}
}

func TestParseHourFromStringRejectsInvalidValue(t *testing.T) {
	if _, err := parseHourFromString("24:00"); err == nil {
		t.Fatal("expected error for invalid hour")
	}
}

func TestIsGreenHour(t *testing.T) {
	if !isGreenHour(23) || !isGreenHour(6) || !isGreenHour(0) {
		t.Fatal("expected green hours to include 23, 00 and 06")
	}
	if isGreenHour(7) {
		t.Fatal("expected 07:00 to be non-green")
	}
}

func TestValidateTransition(t *testing.T) {
	if err := validateTransition(StatusPending, StatusConfirmed); err != nil {
		t.Fatalf("expected valid transition, got %v", err)
	}
	if err := validateTransition(StatusCompleted, StatusCharging); err == nil {
		t.Fatal("expected invalid transition to fail")
	}
}

func TestIsTerminalStatus(t *testing.T) {
	if !isTerminalStatus(StatusCompleted) || !isTerminalStatus(StatusNoShow) {
		t.Fatal("expected completed and no-show to be terminal")
	}
	if isTerminalStatus(StatusPending) {
		t.Fatal("expected pending to be non-terminal")
	}
}

func TestCheckInWindow(t *testing.T) {
	reservation := generated.Reservation{
		Date: pgtype.Timestamptz{
			Time:  time.Date(2026, time.May, 29, 0, 0, 0, 0, turkeyLocation),
			Valid: true,
		},
		Hour: "14:00",
	}

	windowStart, windowEnd, err := checkInWindow(reservation)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if windowStart.Hour() != 13 || windowStart.Minute() != 45 {
		t.Fatalf("unexpected window start: %v", windowStart)
	}
	if windowEnd.Hour() != 14 || windowEnd.Minute() != 10 {
		t.Fatalf("unexpected window end: %v", windowEnd)
	}
}

func TestValidateQRPayload(t *testing.T) {
	now := time.Now().UTC()
	payload := makeQRPayload(42, "secret-key", now)

	if err := validateQRPayload(payload, 42, "secret-key", now); err != nil {
		t.Fatalf("expected QR payload to be valid, got %v", err)
	}
}

func TestValidateQRPayloadRejectsExpiredOrWrongStation(t *testing.T) {
	now := time.Now().UTC()
	payload := makeQRPayload(42, "secret-key", now.Add(-11*time.Minute))

	if err := validateQRPayload(payload, 42, "secret-key", now); err == nil {
		t.Fatal("expected expired payload to fail")
	}

	validPayload := makeQRPayload(42, "secret-key", now)
	if err := validateQRPayload(validPayload, 43, "secret-key", now); err == nil {
		t.Fatal("expected wrong-station payload to fail")
	}
}

func TestHaversineMeters(t *testing.T) {
	distance, err := haversineMeters(38.614, 27.405, 38.614, 27.405)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if distance != 0 {
		t.Fatalf("expected zero distance, got %f", distance)
	}

	if _, err := haversineMeters(100, 27.4, 38.6, 27.4); err == nil {
		t.Fatal("expected invalid coordinates to fail")
	}
}
