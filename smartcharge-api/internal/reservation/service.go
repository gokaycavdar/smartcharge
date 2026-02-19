package reservation

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles reservation business logic.
type Service struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

// NewService creates a new reservation service.
func NewService(queries *generated.Queries, pool *pgxpool.Pool) *Service {
	return &Service{queries: queries, pool: pool}
}

// Create creates a new reservation with campaign coin bonus applied.
func (s *Service) Create(ctx context.Context, userID int32, req CreateReservationRequest) (*ReservationResponse, error) {
	// Parse date
	reservationDate, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		// Try date-only format as fallback
		reservationDate, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			return nil, apperrors.NewValidationError("Invalid date format")
		}
	}

	// Check for active campaigns to apply bonus coins
	campaigns, err := s.queries.GetActiveCampaignsForStation(ctx, pgtype.Int4{Int32: req.StationID, Valid: true})
	if err != nil {
		campaigns = []generated.Campaign{}
	}

	earnedCoins := int32(10)
	if req.IsGreen {
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
		IsGreen:     req.IsGreen,
		EarnedCoins: earnedCoins,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(reservation), nil
}

// UpdateStatus updates a reservation's status (e.g. CANCELLED).
func (s *Service) UpdateStatus(ctx context.Context, reservationID int32, req UpdateStatusRequest) error {
	// Verify reservation exists
	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return apperrors.NewNotFoundError("Reservation")
	}

	// Don't allow updating already completed reservations
	if existing.Status == "COMPLETED" {
		return apperrors.ErrAlreadyCompleted
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
func (s *Service) Complete(ctx context.Context, reservationID int32) (*CompleteResponse, error) {
	// Get reservation
	reservation, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if reservation.Status == "COMPLETED" {
		return nil, apperrors.ErrAlreadyCompleted
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

	// 1. Complete reservation
	updatedReservation, err := qtx.CompleteReservation(ctx, generated.CompleteReservationParams{
		ID:          reservationID,
		EarnedCoins: earnedCoins,
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
	}, nil
}

// --- helpers ---

func reservationToResponse(r generated.Reservation) *ReservationResponse {
	dateStr := ""
	if r.Date.Valid {
		dateStr = r.Date.Time.UTC().Format(time.RFC3339)
	}

	return &ReservationResponse{
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
}
