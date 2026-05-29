package reservation

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/badge"
	apperrors "smartcharge-api/internal/errors"
)

const (
	greenStart = 23
	greenEnd   = 6

	checkInRadiusMeters     = 50.0
	checkInWindowBeforeMins = 15
	checkInWindowAfterMins  = 10
	qrMaxClockSkewMinutes   = 10
)

var turkeyLocation = time.FixedZone("TRT", 3*60*60)

// Reservation status constants.
const (
	StatusPending   = "PENDING"
	StatusConfirmed = "CONFIRMED"
	StatusCharging  = "CHARGING"
	StatusCompleted = "COMPLETED"
	StatusCancelled = "CANCELLED"
	StatusFailed    = "FAILED"
	StatusNoShow    = "NO_SHOW"

	CheckInMethodGeo = "GEOLOCATION"
	CheckInMethodQR  = "QR"
)

// validTransitions defines the full state machine.
//
//	PENDING   -> CONFIRMED | CANCELLED
//	CONFIRMED -> CHARGING  | CANCELLED
//	CHARGING  -> COMPLETED | FAILED | CANCELLED
//
// COMPLETED, CANCELLED, and FAILED are terminal states.
var validTransitions = map[string][]string{
	StatusPending:   {StatusConfirmed, StatusCancelled, StatusNoShow},
	StatusConfirmed: {StatusCharging, StatusCancelled},
	StatusCharging:  {StatusCompleted, StatusFailed, StatusCancelled},
}

// isGreenHour returns true if the hour falls in the green window (23:00–06:00).
func isGreenHour(hour int32) bool {
	return hour >= greenStart || hour <= greenEnd
}

// parseHourFromString parses "14:00" -> 14.
func parseHourFromString(hourStr string) (int32, error) {
	parts := strings.SplitN(hourStr, ":", 2)
	if len(parts) == 0 {
		return 0, fmt.Errorf("invalid hour format: %s", hourStr)
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid hour format: %s", hourStr)
	}
	if h < 0 || h > 23 {
		return 0, fmt.Errorf("hour out of range: %d", h)
	}
	return int32(h), nil
}

// validateTransition checks if moving from one status to another is allowed.
func validateTransition(from, to string) error {
	allowed, ok := validTransitions[from]
	if !ok {
		return apperrors.NewValidationError(fmt.Sprintf("Gecersiz mevcut durum: %s", from))
	}
	for _, s := range allowed {
		if s == to {
			return nil
		}
	}
	return apperrors.NewValidationError(
		fmt.Sprintf("%s durumundan %s durumuna gecilemez", from, to),
	)
}

// isTerminalStatus returns true if the status is a terminal state (no further transitions).
func isTerminalStatus(status string) bool {
	return status == StatusCompleted || status == StatusCancelled || status == StatusFailed || status == StatusNoShow
}

// Service handles reservation business logic.
type Service struct {
	queries        *generated.Queries
	pool           reservationPool
	badgeEvaluator *badge.Evaluator
}

type reservationPool interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	BeginTx(ctx context.Context, txOptions pgx.TxOptions) (pgx.Tx, error)
}

// NewService creates a new reservation service.
func NewService(queries *generated.Queries, pool *pgxpool.Pool, badgeEvaluator *badge.Evaluator) *Service {
	return &Service{queries: queries, pool: pool, badgeEvaluator: badgeEvaluator}
}

// Create creates a new reservation with campaign coin bonus applied.
// Server-side isGreen validation: the client-sent isGreen is ignored,
// the server computes it from the submitted hour.
func (s *Service) Create(ctx context.Context, userID int32, req CreateReservationRequest) (*ReservationResponse, error) {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation create: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	// Parse date
	reservationDate, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		// Try date-only format as fallback
		reservationDate, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			return nil, apperrors.NewValidationError("Invalid date format")
		}
	}

	// Server-side isGreen validation: compute from hour, ignore client value
	hour, err := parseHourFromString(req.Hour)
	if err != nil {
		return nil, apperrors.NewValidationError("Invalid hour format. Use HH:00")
	}
	computedIsGreen := isGreenHour(hour)

	dateInTR := reservationDate.In(turkeyLocation)
	reservationStart := time.Date(
		dateInTR.Year(),
		dateInTR.Month(),
		dateInTR.Day(),
		int(hour),
		0,
		0,
		0,
		turkeyLocation,
	)

	nowTR := time.Now().In(turkeyLocation)
	if nowTR.After(reservationStart.Add(time.Duration(checkInWindowAfterMins) * time.Minute)) {
		return nil, apperrors.NewValidationError("Gecmis bir randevu saati secilemez")
	}

	// Capacity check: verify station has available slots for this date+hour
	station, err := s.queries.GetStationByID(ctx, req.StationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	// Duplicate reservation check: prevent same user from booking same station+date+hour
	existingCount, err := s.queries.HasActiveReservation(ctx, generated.HasActiveReservationParams{
		UserID:    userID,
		StationID: req.StationID,
		Column3: pgtype.Date{
			Time:  reservationDate,
			Valid: true,
		},
		Hour: req.Hour,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	if existingCount > 0 {
		return nil, apperrors.NewConflictError("Bu saat diliminde zaten bir rezervasyonunuz var")
	}

	activeCount, err := s.queries.CountActiveReservations(ctx, generated.CountActiveReservationsParams{
		StationID: req.StationID,
		Column2: pgtype.Date{
			Time:  reservationDate,
			Valid: true,
		},
		Hour: req.Hour,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	if activeCount >= station.Capacity {
		return nil, apperrors.NewValidationError("Bu saat dilimi dolu")
	}

	// Check for active campaigns to apply bonus coins
	campaigns, err := s.queries.GetActiveCampaignsForStation(ctx, pgtype.Int4{Int32: req.StationID, Valid: true})
	if err != nil {
		campaigns = []generated.Campaign{}
	}

	earnedCoins := int32(10)
	if computedIsGreen {
		earnedCoins = 50
	}

	// Apply campaign coin reward from the most recent active campaign
	if len(campaigns) > 0 && campaigns[0].CoinReward > 0 {
		earnedCoins += campaigns[0].CoinReward
	}

	reservation, err := s.queries.CreateReservation(ctx, generated.CreateReservationParams{
		UserID:    userID,
		StationID: req.StationID,
		Date: pgtype.Timestamptz{
			Time:  reservationDate,
			Valid: true,
		},
		Hour:        req.Hour,
		IsGreen:     computedIsGreen,
		EarnedCoins: earnedCoins,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(reservation), nil
}

// Confirm transitions a PENDING reservation to CONFIRMED.
// Verifies ownership.
func (s *Service) Confirm(ctx context.Context, reservationID int32, userID int32) (*ReservationResponse, error) {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation confirm: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if existing.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if err := validateTransition(existing.Status, StatusConfirmed); err != nil {
		return nil, err
	}

	updated, err := s.queries.ConfirmReservation(ctx, reservationID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(updated), nil
}

// StartCharging transitions a CONFIRMED reservation to CHARGING.
// Verifies ownership.
func (s *Service) StartCharging(ctx context.Context, reservationID int32, userID int32) (*ReservationResponse, error) {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation start charging: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if existing.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if err := validateTransition(existing.Status, StatusCharging); err != nil {
		return nil, err
	}

	updated, err := s.queries.StartCharging(ctx, reservationID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(updated), nil
}

// UpdateStatus updates a reservation's status (e.g. CANCELLED).
// Verifies that the authenticated user owns the reservation and validates the status transition.
func (s *Service) UpdateStatus(ctx context.Context, reservationID int32, userID int32, req UpdateStatusRequest) error {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation update status: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	// Verify reservation exists
	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return apperrors.NewNotFoundError("Reservation")
	}

	// Ownership check
	if existing.UserID != userID {
		return apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	// Don't allow updating terminal states
	if isTerminalStatus(existing.Status) {
		return apperrors.NewValidationError(
			fmt.Sprintf("Rezervasyon zaten %s durumunda, degistirilemez", existing.Status),
		)
	}

	// Validate status transition
	if err := validateTransition(existing.Status, req.Status); err != nil {
		return err
	}

	_, err = s.queries.UpdateReservationStatus(ctx, generated.UpdateReservationStatusParams{
		ID:     reservationID,
		Status: req.Status,
	})
	if err != nil {
		return apperrors.ErrInternal
	}

	return nil
}

// Complete atomically completes a reservation and awards the user coins, XP, and CO2.
// The reservation must be in CHARGING status.
// Verifies that the authenticated user owns the reservation.
func (s *Service) Complete(ctx context.Context, reservationID int32, userID int32) (*CompleteResponse, error) {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation complete: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	// Get reservation
	reservation, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	// Ownership check
	if reservation.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if reservation.Status == StatusCompleted {
		return nil, apperrors.ErrAlreadyCompleted
	}

	// Validate status transition: only CHARGING -> COMPLETED
	if err := validateTransition(reservation.Status, StatusCompleted); err != nil {
		return nil, err
	}

	// Use stored reservation values — never allow client override
	earnedCoins := reservation.EarnedCoins
	xpDelta := int32(100)

	co2Delta := 0.5
	if reservation.IsGreen {
		co2Delta = 2.5
	}

	// Begin transaction
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// 1. Complete reservation (now includes saved_co2 and completed_at)
	updatedReservation, err := qtx.CompleteReservation(ctx, generated.CompleteReservationParams{
		ID:          reservationID,
		EarnedCoins: earnedCoins,
		SavedCo2:    co2Delta,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// 2. Update user stats
	updatedUser, err := qtx.UpdateUserStats(ctx, generated.UpdateUserStatsParams{
		ID:       reservation.UserID,
		Coins:    earnedCoins,
		Co2Saved: co2Delta,
		Xp:       xpDelta,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// 3. Evaluate badges (inside the transaction)
	var awardedBadges []badge.AwardedBadge
	if s.badgeEvaluator != nil {
		// Parse hour from reservation
		hour, hErr := parseHourFromString(reservation.Hour)
		if hErr != nil {
			log.Printf("reservation complete: failed to parse hour for badge eval: %v", hErr)
			hour = 0
		}

		// Parse date for day of week
		var dayOfWeek int32
		if reservation.Date.Valid {
			dayOfWeek = int32(reservation.Date.Time.Weekday())
		}

		// Get station for density profile
		stn, sErr := qtx.GetStationByID(ctx, reservation.StationID)
		densityProfile := ""
		if sErr != nil {
			log.Printf("reservation complete: failed to get station %d for badge eval: %v", reservation.StationID, sErr)
		} else {
			densityProfile = stn.DensityProfile
		}

		event := badge.Event{
			UserID:         reservation.UserID,
			StationID:      reservation.StationID,
			IsGreen:        reservation.IsGreen,
			Hour:           hour,
			DayOfWeek:      dayOfWeek,
			DensityProfile: densityProfile,
		}

		awarded, bErr := s.badgeEvaluator.Evaluate(ctx, qtx, event)
		if bErr != nil {
			log.Printf("reservation complete: badge evaluation failed (non-fatal): %v", bErr)
			// Non-fatal: don't fail the reservation completion if badge eval fails
		} else {
			awardedBadges = awarded
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.ErrInternal
	}

	return &CompleteResponse{
		Reservation: *reservationToResponse(updatedReservation),
		User: UserStatsResponse{
			ID:       updatedUser.ID,
			Coins:    updatedUser.Coins,
			Co2Saved: updatedUser.Co2Saved,
			XP:       updatedUser.Xp,
		},
		AwardedBadges: awardedBadges,
	}, nil
}

// CheckIn verifies physical presence (GPS or QR) and confirms reservation.
func (s *Service) CheckIn(ctx context.Context, reservationID int32, userID int32, req CheckInRequest) (*ReservationResponse, error) {
	if err := s.markNoShowsForUser(ctx, userID); err != nil {
		log.Printf("reservation check-in: failed to auto mark no-shows for user %d: %v", userID, err)
	}

	reservation, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if reservation.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if reservation.Status == StatusNoShow {
		return nil, apperrors.NewValidationError("Check-in suresi gectigi icin rezervasyon no-show oldu")
	}

	if reservation.Status != StatusPending && reservation.Status != StatusConfirmed {
		return nil, apperrors.NewValidationError("Check-in sadece bekleyen rezervasyonlar icin yapilabilir")
	}

	if reservation.CheckedInAt.Valid {
		return nil, apperrors.NewValidationError("Bu rezervasyon zaten check-in yapildi")
	}

	now := time.Now().In(turkeyLocation)
	windowStart, windowEnd, err := checkInWindow(reservation)
	if err != nil {
		return nil, apperrors.NewValidationError("Rezervasyon saati gecersiz")
	}

	if now.Before(windowStart) {
		return nil, apperrors.NewValidationError("Check-in suresi henuz baslamadi")
	}

	if now.After(windowEnd) {
		if markErr := s.markReservationNoShow(ctx, reservationID); markErr != nil {
			log.Printf("reservation check-in: failed to mark no-show for reservation %d: %v", reservationID, markErr)
		}
		return nil, apperrors.NewValidationError("Check-in suresi doldu, rezervasyon no-show olarak isaretlendi")
	}

	method := strings.ToUpper(strings.TrimSpace(req.Method))
	if method != CheckInMethodGeo && method != CheckInMethodQR {
		return nil, apperrors.NewValidationError("Gecersiz check-in metodu")
	}

	stationLat, stationLng, stationQRSecret, err := s.getStationCheckInMeta(ctx, reservation.StationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	switch method {
	case CheckInMethodGeo:
		distanceMeters, distanceErr := haversineMeters(req.Latitude, req.Longitude, stationLat, stationLng)
		if distanceErr != nil {
			return nil, apperrors.NewValidationError("Gecersiz konum bilgisi")
		}
		if distanceMeters > checkInRadiusMeters {
			return nil, apperrors.NewValidationError(fmt.Sprintf("Istasyona uzaksiniz (%.0f m). En fazla 50 m icinde olmalisiniz", distanceMeters))
		}
	case CheckInMethodQR:
		if err := validateQRPayload(req.QRPayload, reservation.StationID, stationQRSecret, time.Now().UTC()); err != nil {
			return nil, apperrors.NewValidationError(err.Error())
		}
	}

	updated, err := s.applyCheckIn(ctx, reservationID, method, reservation.Status)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return updated, nil
}

// --- helpers ---

func reservationToResponse(r generated.Reservation) *ReservationResponse {
	dateStr := ""
	if r.Date.Valid {
		dateStr = r.Date.Time.UTC().Format(time.RFC3339)
	}

	resp := &ReservationResponse{
		ID:          r.ID,
		UserID:      r.UserID,
		StationID:   r.StationID,
		Date:        dateStr,
		Hour:        r.Hour,
		IsGreen:     r.IsGreen,
		EarnedCoins: r.EarnedCoins,
		SavedCo2:    r.SavedCo2,
		Status:      r.Status,
	}

	if r.ConfirmedAt.Valid {
		s := r.ConfirmedAt.Time.UTC().Format(time.RFC3339)
		resp.ConfirmedAt = &s
	}
	if r.StartedAt.Valid {
		s := r.StartedAt.Time.UTC().Format(time.RFC3339)
		resp.StartedAt = &s
	}
	if r.CompletedAt.Valid {
		s := r.CompletedAt.Time.UTC().Format(time.RFC3339)
		resp.CompletedAt = &s
	}
	return resp
}

func reservationStartTime(r generated.Reservation) (time.Time, error) {
	hour, err := parseHourFromString(r.Hour)
	if err != nil {
		return time.Time{}, err
	}

	if !r.Date.Valid {
		return time.Time{}, fmt.Errorf("reservation date is invalid")
	}

	d := r.Date.Time.In(turkeyLocation)
	return time.Date(d.Year(), d.Month(), d.Day(), int(hour), 0, 0, 0, turkeyLocation), nil
}

func checkInWindow(r generated.Reservation) (time.Time, time.Time, error) {
	start, err := reservationStartTime(r)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	windowStart := start.Add(-time.Duration(checkInWindowBeforeMins) * time.Minute)
	windowEnd := start.Add(time.Duration(checkInWindowAfterMins) * time.Minute)
	return windowStart, windowEnd, nil
}

func (s *Service) markNoShowsForUser(ctx context.Context, userID int32) error {
	const query = `UPDATE reservations
SET status = 'NO_SHOW', no_show_at = NOW(), updated_at = NOW()
WHERE user_id = $1
  AND status = 'PENDING'
  AND (NOW() AT TIME ZONE 'Europe/Istanbul') > (((date AT TIME ZONE 'Europe/Istanbul')::date + hour::time) + INTERVAL '10 minutes')`

	_, err := s.pool.Exec(ctx, query, userID)
	return err
}

func (s *Service) markReservationNoShow(ctx context.Context, reservationID int32) error {
	const query = `UPDATE reservations
SET status = 'NO_SHOW', no_show_at = NOW(), updated_at = NOW()
WHERE id = $1
RETURNING id, user_id, station_id, date, hour, is_green, earned_coins, saved_co2, status, created_at, updated_at, confirmed_at, started_at, completed_at, checked_in_at, check_in_method, no_show_at`

	row := s.pool.QueryRow(ctx, query, reservationID)
	_, err := scanReservationResponse(row)
	return err
}

func (s *Service) applyCheckIn(ctx context.Context, reservationID int32, method, currentStatus string) (*ReservationResponse, error) {
	query := `UPDATE reservations
SET checked_in_at = NOW(), check_in_method = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, user_id, station_id, date, hour, is_green, earned_coins, saved_co2, status, created_at, updated_at, confirmed_at, started_at, completed_at, checked_in_at, check_in_method, no_show_at`

	if currentStatus == StatusPending {
		query = `UPDATE reservations
SET status = 'CONFIRMED', confirmed_at = NOW(), checked_in_at = NOW(), check_in_method = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, user_id, station_id, date, hour, is_green, earned_coins, saved_co2, status, created_at, updated_at, confirmed_at, started_at, completed_at, checked_in_at, check_in_method, no_show_at`
	}

	row := s.pool.QueryRow(ctx, query, reservationID, method)
	return scanReservationResponse(row)
}

func (s *Service) getStationCheckInMeta(ctx context.Context, stationID int32) (float64, float64, string, error) {
	const query = `SELECT lat, lng, qr_secret FROM stations WHERE id = $1`

	row := s.pool.QueryRow(ctx, query, stationID)
	var lat, lng float64
	var qrSecret string
	if err := row.Scan(&lat, &lng, &qrSecret); err != nil {
		return 0, 0, "", err
	}
	return lat, lng, qrSecret, nil
}

func haversineMeters(lat1, lng1, lat2, lng2 float64) (float64, error) {
	if lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 || lng1 < -180 || lng1 > 180 || lng2 < -180 || lng2 > 180 {
		return 0, fmt.Errorf("invalid coordinates")
	}

	const earthRadiusMeters = 6371000.0
	toRad := func(v float64) float64 { return v * math.Pi / 180 }

	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusMeters * c, nil
}

func validateQRPayload(payload string, expectedStationID int32, secret string, now time.Time) error {
	trimmed := strings.TrimSpace(payload)
	parts := strings.Split(trimmed, ":")
	if len(parts) != 4 || parts[0] != "SCCHK" {
		return fmt.Errorf("QR payload gecersiz")
	}

	stationID64, err := strconv.ParseInt(parts[1], 10, 32)
	if err != nil {
		return fmt.Errorf("QR istasyon bilgisi gecersiz")
	}
	stationID := int32(stationID64)
	if stationID != expectedStationID {
		return fmt.Errorf("QR kodu bu istasyona ait degil")
	}

	tsUnix, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		return fmt.Errorf("QR zaman bilgisi gecersiz")
	}
	timestamp := time.Unix(tsUnix, 0).UTC()
	if now.Sub(timestamp) > time.Duration(qrMaxClockSkewMinutes)*time.Minute || timestamp.Sub(now) > time.Duration(qrMaxClockSkewMinutes)*time.Minute {
		return fmt.Errorf("QR kodunun suresi gecmis")
	}

	providedSig, err := hex.DecodeString(parts[3])
	if err != nil {
		return fmt.Errorf("QR imzasi gecersiz")
	}

	message := fmt.Sprintf("%d:%d", stationID, tsUnix)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	expectedSig := mac.Sum(nil)

	if len(providedSig) != len(expectedSig) || subtle.ConstantTimeCompare(providedSig, expectedSig) != 1 {
		return fmt.Errorf("QR dogrulamasi basarisiz")
	}

	return nil
}

func scanReservationResponse(row pgx.Row) (*ReservationResponse, error) {
	var (
		r           generated.Reservation
		checkedInAt pgtype.Timestamptz
		checkMethod pgtype.Text
		noShowAt    pgtype.Timestamptz
	)
	err := row.Scan(
		&r.ID,
		&r.UserID,
		&r.StationID,
		&r.Date,
		&r.Hour,
		&r.IsGreen,
		&r.EarnedCoins,
		&r.SavedCo2,
		&r.Status,
		&r.CreatedAt,
		&r.UpdatedAt,
		&r.ConfirmedAt,
		&r.StartedAt,
		&r.CompletedAt,
		&checkedInAt,
		&checkMethod,
		&noShowAt,
	)
	if err != nil {
		return nil, err
	}

	resp := reservationToResponse(r)
	if checkedInAt.Valid {
		s := checkedInAt.Time.UTC().Format(time.RFC3339)
		resp.CheckedInAt = &s
	}
	if checkMethod.Valid {
		resp.CheckInMethod = &checkMethod.String
	}
	if noShowAt.Valid {
		s := noShowAt.Time.UTC().Format(time.RFC3339)
		resp.NoShowAt = &s
	}

	return resp, nil
}
