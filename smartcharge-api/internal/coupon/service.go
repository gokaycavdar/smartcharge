package coupon

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
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

// GetUserCouponHistory returns all coupons created by user using SmartCoin
func (s *Service) GetUserCouponHistory(ctx context.Context, userID int32) (*CouponHistoryResponse, error) {
	const query = `SELECT uc.id,
	       uc.coupon_id,
	       uc.code,
	       CASE
	           WHEN uc.status = 'USED' THEN 'USED'
	           WHEN uc.expires_at <= NOW() THEN 'EXPIRED'
	           ELSE 'ACTIVE'
	       END AS status,
	       uc.created_at,
	       uc.expires_at,
	       cc.name,
	       cc.discount_type,
	       cc.discount_value,
	       cc.icon
	FROM user_coupons uc
	JOIN coupon_catalog cc ON cc.id = uc.coupon_id
	WHERE uc.user_id = $1
	ORDER BY uc.created_at DESC`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	defer rows.Close()

	coupons := make([]UserCoupon, 0)
	for rows.Next() {
		var (
			id            int32
			couponID      int32
			code          string
			status        string
			createdAt     pgtype.Timestamptz
			expiresAt     pgtype.Timestamptz
			name          string
			discountType  string
			discountValue float64
			icon          string
		)

		if err := rows.Scan(
			&id,
			&couponID,
			&code,
			&status,
			&createdAt,
			&expiresAt,
			&name,
			&discountType,
			&discountValue,
			&icon,
		); err != nil {
			return nil, apperrors.ErrInternal
		}

		createdAtStr := ""
		if createdAt.Valid {
			createdAtStr = createdAt.Time.UTC().Format(time.RFC3339)
		}

		expiresAtStr := ""
		if expiresAt.Valid {
			expiresAtStr = expiresAt.Time.UTC().Format(time.RFC3339)
		}

		coupons = append(coupons, UserCoupon{
			ID:            id,
			CouponID:      couponID,
			Name:          name,
			DiscountType:  discountType,
			DiscountValue: discountValue,
			Icon:          icon,
			Status:        status,
			Code:          code,
			ExpiresAt:     expiresAtStr,
			CreatedAt:     createdAtStr,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.ErrInternal
	}

	return &CouponHistoryResponse{
		TotalCoupons: int32(len(coupons)),
		Coupons:      coupons,
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

// ListCouponsAdmin returns coupon catalog rows for operator/admin panel.
func (s *Service) ListCouponsAdmin(ctx context.Context, params AdminCouponListParams) (*AdminCouponListResponse, error) {
	if params.Limit <= 0 {
		params.Limit = 10
	}
	if params.Limit > 100 {
		params.Limit = 100
	}
	if params.Offset < 0 {
		params.Offset = 0
	}

	args := make([]interface{}, 0, 4)
	conditions := make([]string, 0, 2)
	argIdx := 1

	if params.Active != nil {
		conditions = append(conditions, fmt.Sprintf("cc.active = $%d", argIdx))
		args = append(args, *params.Active)
		argIdx++
	}

	if strings.TrimSpace(params.Search) != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(cc.name) LIKE $%d OR LOWER(cc.description) LIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(params.Search))+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	listQuery := `
		SELECT
			cc.id,
			cc.name,
			cc.description,
			cc.coin_cost,
			cc.discount_type,
			cc.discount_value,
			cc.icon,
			cc.active,
			COALESCE(stats.total_usage_count, 0) AS total_usage_count,
			COALESCE(stats.active_usage_count, 0) AS active_usage_count,
			cc.created_at,
			cc.updated_at
		FROM coupon_catalog cc
		LEFT JOIN (
			SELECT
				coupon_id,
				COUNT(*)::INT AS total_usage_count,
				COUNT(*) FILTER (WHERE status = 'ACTIVE')::INT AS active_usage_count
			FROM user_coupons
			GROUP BY coupon_id
		) stats ON stats.coupon_id = cc.id` + whereClause + `
		ORDER BY cc.created_at DESC, cc.id DESC
		LIMIT $` + fmt.Sprintf("%d", argIdx) + ` OFFSET $` + fmt.Sprintf("%d", argIdx+1)

	args = append(args, params.Limit, params.Offset)

	rows, err := s.pool.Query(ctx, listQuery, args...)
	if err != nil {
		log.Printf("coupon admin list query failed: %v", err)
		return nil, apperrors.ErrInternal
	}
	defer rows.Close()

	coupons := make([]CatalogCoupon, 0)
	for rows.Next() {
		item, scanErr := scanCatalogCoupon(rows)
		if scanErr != nil {
			log.Printf("coupon admin list scan failed: %v", scanErr)
			return nil, apperrors.ErrInternal
		}
		coupons = append(coupons, item)
	}
	if err := rows.Err(); err != nil {
		log.Printf("coupon admin list rows failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	countQuery := `SELECT COUNT(*) FROM coupon_catalog cc` + whereClause
	countArgs := args[:len(args)-2]
	var total int64
	if err := s.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		log.Printf("coupon admin count query failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	return &AdminCouponListResponse{Coupons: coupons, Total: total}, nil
}

func (s *Service) GetCouponByIDAdmin(ctx context.Context, couponID int32) (*CatalogCoupon, error) {
	const query = `
		SELECT
			cc.id,
			cc.name,
			cc.description,
			cc.coin_cost,
			cc.discount_type,
			cc.discount_value,
			cc.icon,
			cc.active,
			COALESCE(stats.total_usage_count, 0) AS total_usage_count,
			COALESCE(stats.active_usage_count, 0) AS active_usage_count,
			cc.created_at,
			cc.updated_at
		FROM coupon_catalog cc
		LEFT JOIN (
			SELECT
				coupon_id,
				COUNT(*)::INT AS total_usage_count,
				COUNT(*) FILTER (WHERE status = 'ACTIVE')::INT AS active_usage_count
			FROM user_coupons
			GROUP BY coupon_id
		) stats ON stats.coupon_id = cc.id
		WHERE cc.id = $1`

	row := s.pool.QueryRow(ctx, query, couponID)
	item, err := scanCatalogCoupon(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("Coupon")
		}
		log.Printf("coupon admin get by id failed (id=%d): %v", couponID, err)
		return nil, apperrors.ErrInternal
	}

	return &item, nil
}

func (s *Service) CreateCoupon(ctx context.Context, req CreateCatalogCouponRequest) (*CatalogCoupon, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperrors.NewValidationError("name is required")
	}
	if req.CoinCost <= 0 {
		return nil, apperrors.NewValidationError("coinCost must be greater than 0")
	}
	if req.DiscountValue <= 0 {
		return nil, apperrors.NewValidationError("discountValue must be greater than 0")
	}

	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM coupon_catalog WHERE LOWER(name)=LOWER($1))`, name).Scan(&exists); err != nil {
		log.Printf("coupon create uniqueness check failed: %v", err)
		return nil, apperrors.ErrInternal
	}
	if exists {
		return nil, apperrors.NewConflictError("Coupon name must be unique")
	}

	icon := strings.TrimSpace(req.Icon)
	if icon == "" {
		icon = "*"
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	const query = `
		INSERT INTO coupon_catalog (name, description, coin_cost, discount_type, discount_value, icon, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	var id int32
	if err := s.pool.QueryRow(ctx, query, name, req.Description, req.CoinCost, req.DiscountType, req.DiscountValue, icon, isActive).Scan(&id); err != nil {
		log.Printf("coupon create failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	return s.GetCouponByIDAdmin(ctx, id)
}

func (s *Service) UpdateCoupon(ctx context.Context, couponID int32, req UpdateCatalogCouponRequest) (*CatalogCoupon, error) {
	existing, err := s.GetCouponByIDAdmin(ctx, couponID)
	if err != nil {
		return nil, err
	}

	name := existing.Name
	if strings.TrimSpace(req.Name) != "" {
		name = strings.TrimSpace(req.Name)
	}

	description := existing.Description
	if req.Description != nil {
		description = *req.Description
	}

	coinCost := existing.CoinCost
	if req.CoinCost != nil {
		if *req.CoinCost <= 0 {
			return nil, apperrors.NewValidationError("coinCost must be greater than 0")
		}
		coinCost = *req.CoinCost
	}

	discountType := existing.DiscountType
	if req.DiscountType != "" {
		discountType = req.DiscountType
	}

	discountValue := existing.DiscountValue
	if req.DiscountValue != nil {
		if *req.DiscountValue <= 0 {
			return nil, apperrors.NewValidationError("discountValue must be greater than 0")
		}
		discountValue = *req.DiscountValue
	}

	icon := existing.Icon
	if req.Icon != nil {
		if strings.TrimSpace(*req.Icon) == "" {
			icon = "*"
		} else {
			icon = strings.TrimSpace(*req.Icon)
		}
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	if !strings.EqualFold(name, existing.Name) {
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM coupon_catalog WHERE LOWER(name)=LOWER($1) AND id <> $2)`, name, couponID).Scan(&exists); err != nil {
			log.Printf("coupon update uniqueness check failed: %v", err)
			return nil, apperrors.ErrInternal
		}
		if exists {
			return nil, apperrors.NewConflictError("Coupon name must be unique")
		}
	}

	const query = `
		UPDATE coupon_catalog
		SET name = $2,
		    description = $3,
		    coin_cost = $4,
		    discount_type = $5,
		    discount_value = $6,
		    icon = $7,
		    active = $8,
		    updated_at = NOW()
		WHERE id = $1`

	cmd, err := s.pool.Exec(ctx, query, couponID, name, description, coinCost, discountType, discountValue, icon, isActive)
	if err != nil {
		log.Printf("coupon update failed (id=%d): %v", couponID, err)
		return nil, apperrors.ErrInternal
	}
	if cmd.RowsAffected() == 0 {
		return nil, apperrors.NewNotFoundError("Coupon")
	}

	return s.GetCouponByIDAdmin(ctx, couponID)
}

func (s *Service) DeactivateCoupon(ctx context.Context, couponID int32) (*CatalogCoupon, error) {
	cmd, err := s.pool.Exec(ctx, `UPDATE coupon_catalog SET active = false, updated_at = NOW() WHERE id = $1`, couponID)
	if err != nil {
		log.Printf("coupon deactivate failed (id=%d): %v", couponID, err)
		return nil, apperrors.ErrInternal
	}
	if cmd.RowsAffected() == 0 {
		return nil, apperrors.NewNotFoundError("Coupon")
	}
	return s.GetCouponByIDAdmin(ctx, couponID)
}

func (s *Service) DeleteCoupon(ctx context.Context, couponID int32) error {
	cmd, err := s.pool.Exec(ctx, `DELETE FROM coupon_catalog WHERE id = $1`, couponID)
	if err != nil {
		log.Printf("coupon delete failed (id=%d): %v", couponID, err)
		return apperrors.ErrInternal
	}
	if cmd.RowsAffected() == 0 {
		return apperrors.NewNotFoundError("Coupon")
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanCatalogCoupon(scanner rowScanner) (CatalogCoupon, error) {
	var (
		item      CatalogCoupon
		createdAt pgtype.Timestamptz
		updatedAt pgtype.Timestamptz
	)

	err := scanner.Scan(
		&item.ID,
		&item.Name,
		&item.Description,
		&item.CoinCost,
		&item.DiscountType,
		&item.DiscountValue,
		&item.Icon,
		&item.IsActive,
		&item.TotalUsageCount,
		&item.ActiveUsageCount,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return CatalogCoupon{}, err
	}

	if createdAt.Valid {
		item.CreatedAt = createdAt.Time.UTC()
	}
	if updatedAt.Valid {
		item.UpdatedAt = updatedAt.Time.UTC()
	}

	return item, nil
}
