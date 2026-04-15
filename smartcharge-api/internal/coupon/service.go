package coupon

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles coupon business logic with ACID transaction support
type Service struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

// NewService creates a new coupon service
func NewService(queries *generated.Queries, pool *pgxpool.Pool) *Service {
	return &Service{
		queries: queries,
		pool:    pool,
	}
}

// GetAvailableCoupons returns the catalog of available coupons with user's balance
func (s *Service) GetAvailableCoupons(ctx context.Context, userID int32) (*CouponListResponse, error) {
	// Get user's current coin balance
	user, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("User")
	}

	// Get available coupons from catalog
	coupons, err := s.queries.GetCouponCatalog(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Map coupons with canBuy flag
	couponItems := make([]CouponItem, len(coupons))
	for i, c := range coupons {
		couponItems[i] = CouponItem{
			ID:            c.ID,
			Name:          c.Name,
			Description:   c.Description,
			CoinCost:      c.CoinCost,
			DiscountType:  c.DiscountType,
			DiscountValue: c.DiscountValue,
			Icon:          c.Icon,
			CanBuy:        user.Coins >= c.CoinCost,
		}
	}

	return &CouponListResponse{
		UserCoins:        user.Coins,
		AvailableCoupons: couponItems,
	}, nil
}

// RedeemCoupon handles the coupon redemption with ACID transaction
// Critical: Must use pgx transaction with serialization to prevent race conditions
func (s *Service) RedeemCoupon(ctx context.Context, userID int32, couponID int32) (*RedeemCouponResponse, error) {
	// Start transaction with SERIALIZABLE isolation level for maximum safety
	// against concurrent redeem attempts (race conditions)
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{
		IsoLevel: pgx.Serializable,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	defer tx.Rollback(ctx)

	// Create queries scoped to this transaction
	qtx := s.queries.WithTx(tx)

	// Step 1: Lock and verify user's coin balance (FOR UPDATE prevents concurrent reads)
	userBalance, err := qtx.GetUserCoinBalance(ctx, userID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("User")
	}

	// Step 2: Get coupon details
	coupon, err := qtx.GetCouponByID(ctx, couponID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Coupon")
	}

	// Step 3: Validate user has enough coins (critical check)
	if userBalance < coupon.CoinCost {
		return nil, apperrors.NewConflictError(
			fmt.Sprintf("Not enough coins. Have %d, need %d", userBalance, coupon.CoinCost),
		)
	}

	// Step 4: Generate unique coupon code (format: SC-{random 16 chars})
	code, err := generateCouponCode()
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Step 5: Create user coupon record in same transaction
	userCoupon, err := qtx.CreateUserCoupon(ctx, generated.CreateUserCouponParams{
		UserID:   userID,
		CouponID: couponID,
		Code:     code,
	})
	if err != nil {
		// If unique constraint violated, retry is user's responsibility
		return nil, apperrors.NewConflictError("Coupon code generation failed, please try again")
	}

	// Step 6: Deduct coins from user's balance (only after coupon is created)
	remainingCoins, err := qtx.DeductUserCoins(ctx, generated.DeductUserCoinsParams{
		ID:    userID,
		Coins: coupon.CoinCost,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Step 7: Commit transaction atomically
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.ErrInternal
	}

	// Format response
	expiresAt := userCoupon.ExpiresAt.Time.UTC().Format(time.RFC3339)
	createdAt := userCoupon.CreatedAt.Time.UTC().Format(time.RFC3339)

	return &RedeemCouponResponse{
		UserCoupon: UserCoupon{
			ID:            userCoupon.ID,
			CouponID:      userCoupon.CouponID,
			Name:          coupon.Name,
			DiscountType:  coupon.DiscountType,
			DiscountValue: coupon.DiscountValue,
			Icon:          coupon.Icon,
			Status:        userCoupon.Status,
			Code:          userCoupon.Code,
			ExpiresAt:     expiresAt,
			CreatedAt:     createdAt,
		},
		RemainingCoins: remainingCoins,
		Message:        fmt.Sprintf("✅ %s kuponu başarıyla elde edildi! 90 gün geçerli.", coupon.Name),
	}, nil
}

// GetUserActiveCoupons returns user's active, non-expired coupons
func (s *Service) GetUserActiveCoupons(ctx context.Context, userID int32) (*ActiveCouponsResponse, error) {
	coupons, err := s.queries.GetUserActiveCoupons(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	userCoupons := make([]UserCoupon, len(coupons))
	for i, c := range coupons {
		expiresAt := ""
		if c.ExpiresAt.Valid {
			expiresAt = c.ExpiresAt.Time.UTC().Format(time.RFC3339)
		}
		createdAt := ""
		if c.CreatedAt.Valid {
			createdAt = c.CreatedAt.Time.UTC().Format(time.RFC3339)
		}

		userCoupons[i] = UserCoupon{
			ID:            c.ID,
			CouponID:      c.CouponID,
			Name:          c.Name,
			DiscountType:  c.DiscountType,
			DiscountValue: c.DiscountValue,
			Icon:          c.Icon,
			Status:        c.Status,
			Code:          c.Code,
			ExpiresAt:     expiresAt,
			CreatedAt:     createdAt,
		}
	}

	return &ActiveCouponsResponse{
		TotalActive: int32(len(userCoupons)),
		Coupons:     userCoupons,
	}, nil
}

// generateCouponCode generates a unique coupon code in format: SC-{16 random chars}
func generateCouponCode() (string, error) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 16)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		b[i] = chars[num.Int64()]
	}
	return fmt.Sprintf("SC-%s", string(b)), nil
}
