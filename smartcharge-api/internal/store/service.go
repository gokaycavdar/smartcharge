package store

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles store business logic.
type Service struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

// NewService creates a new store service.
func NewService(queries *generated.Queries, pool *pgxpool.Pool) *Service {
	return &Service{queries: queries, pool: pool}
}

// ListItemsAdmin returns all store items (active + inactive) for operators.
func (s *Service) ListItemsAdmin(ctx context.Context) ([]StoreItem, error) {
	const query = `
		SELECT id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at
		FROM store_items
		ORDER BY created_at DESC, id DESC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		log.Printf("store admin list query failed: %v", err)
		return nil, apperrors.ErrInternal
	}
	defer rows.Close()

	items := make([]StoreItem, 0)
	for rows.Next() {
		var (
			item      StoreItem
			createdBy pgtype.Int4
		)

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Description,
			&item.SmartcoinPrice,
			&item.StockQuantity,
			&item.Icon,
			&item.IsActive,
			&createdBy,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			log.Printf("store admin list scan failed: %v", err)
			return nil, apperrors.ErrInternal
		}

		if createdBy.Valid {
			v := createdBy.Int32
			item.CreatedBy = &v
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		log.Printf("store admin list rows failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	return items, nil
}

// ListActiveItems returns active catalog items for authenticated users.
func (s *Service) ListActiveItems(ctx context.Context, userID int32) (*StoreCatalogResponse, error) {
	coins, err := s.queries.GetUserCoinBalance(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("User")
		}
		log.Printf("store list items user balance failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	const query = `
		SELECT id, name, description, smartcoin_price, stock_quantity, icon
		FROM store_items
		WHERE is_active = true
		ORDER BY smartcoin_price ASC, id ASC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		log.Printf("store list items query failed: %v", err)
		return nil, apperrors.ErrInternal
	}
	defer rows.Close()

	items := make([]StoreCatalogItem, 0)
	for rows.Next() {
		var item StoreCatalogItem
		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.Description,
			&item.SmartcoinPrice,
			&item.StockQuantity,
			&item.Icon,
		); err != nil {
			log.Printf("store list items scan failed: %v", err)
			return nil, apperrors.ErrInternal
		}
		item.CanBuy = item.StockQuantity > 0 && coins >= item.SmartcoinPrice
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		log.Printf("store list items rows error: %v", err)
		return nil, apperrors.ErrInternal
	}

	return &StoreCatalogResponse{
		UserCoins: coins,
		Items:     items,
	}, nil
}

// PurchaseItem purchases an active store item with ACID transaction guarantees.
func (s *Service) PurchaseItem(ctx context.Context, userID int32, req PurchaseItemRequest) (*PurchaseItemResponse, error) {
	quantity := req.Quantity
	if quantity <= 0 {
		quantity = 1
	}

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		log.Printf("store purchase begin tx failed: %v", err)
		return nil, apperrors.ErrInternal
	}
	defer tx.Rollback(ctx)

	userCoins, err := getUserCoinsForUpdate(ctx, tx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("User")
		}
		log.Printf("store purchase lock user failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	item, err := getStoreItemForUpdate(ctx, tx, req.StoreItemID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("Store item")
		}
		log.Printf("store purchase lock item failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	if !item.IsActive {
		return nil, apperrors.NewConflictError("Store item is not active")
	}

	if item.StockQuantity < quantity {
		return nil, apperrors.NewConflictError("Insufficient stock")
	}

	totalCost := item.SmartcoinPrice * quantity
	if userCoins < totalCost {
		return nil, apperrors.NewConflictError(
			fmt.Sprintf("Not enough Smartcoins. Have %d, need %d", userCoins, totalCost),
		)
	}

	remainingCoins, err := deductUserCoinsTx(ctx, tx, userID, totalCost)
	if err != nil {
		log.Printf("store purchase deduct coins failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	remainingStock, err := decrementStockTx(ctx, tx, req.StoreItemID, quantity)
	if err != nil {
		log.Printf("store purchase decrement stock failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	purchase, err := createPurchaseHistoryTx(ctx, tx, userID, req.StoreItemID, quantity, item.SmartcoinPrice, totalCost)
	if err != nil {
		log.Printf("store purchase insert history failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("store purchase commit failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	purchase.PurchasedAt = purchase.PurchasedAt.UTC()

	return &PurchaseItemResponse{
		Purchase:       purchase,
		RemainingCoins: remainingCoins,
		RemainingStock: remainingStock,
		Message:        fmt.Sprintf("%s satin alindi", item.Name),
	}, nil
}

// CreateItem creates a new store product.
func (s *Service) CreateItem(ctx context.Context, adminUserID int32, req CreateStoreItemRequest) (*StoreItem, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, apperrors.NewValidationError("name is required")
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
		INSERT INTO store_items (name, description, smartcoin_price, stock_quantity, icon, is_active, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at`

	var (
		item      StoreItem
		createdBy pgtype.Int4
	)

	err := s.pool.QueryRow(ctx, query,
		name,
		req.Description,
		req.SmartcoinPrice,
		req.StockQuantity,
		icon,
		isActive,
		adminUserID,
	).Scan(
		&item.ID,
		&item.Name,
		&item.Description,
		&item.SmartcoinPrice,
		&item.StockQuantity,
		&item.Icon,
		&item.IsActive,
		&createdBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		log.Printf("store create item failed: %v", err)
		return nil, apperrors.ErrInternal
	}

	if createdBy.Valid {
		v := createdBy.Int32
		item.CreatedBy = &v
	}

	return &item, nil
}

// UpdateItemPricingStock updates only smartcoin price and stock quantity.
func (s *Service) UpdateItemPricingStock(ctx context.Context, itemID int32, req UpdateStoreItemRequest) (*StoreItem, error) {
	const query = `
		UPDATE store_items
		SET smartcoin_price = $2,
		    stock_quantity = $3,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at`

	var (
		item      StoreItem
		createdBy pgtype.Int4
	)

	err := s.pool.QueryRow(ctx, query, itemID, req.SmartcoinPrice, req.StockQuantity).Scan(
		&item.ID,
		&item.Name,
		&item.Description,
		&item.SmartcoinPrice,
		&item.StockQuantity,
		&item.Icon,
		&item.IsActive,
		&createdBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("Store item")
		}
		log.Printf("store update item failed (id=%d): %v", itemID, err)
		return nil, apperrors.ErrInternal
	}

	if createdBy.Valid {
		v := createdBy.Int32
		item.CreatedBy = &v
	}

	return &item, nil
}

// DeactivateItem marks an item as inactive (soft delete).
func (s *Service) DeactivateItem(ctx context.Context, itemID int32) (*StoreItem, error) {
	const query = `
		UPDATE store_items
		SET is_active = false,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at`

	var (
		item      StoreItem
		createdBy pgtype.Int4
	)

	err := s.pool.QueryRow(ctx, query, itemID).Scan(
		&item.ID,
		&item.Name,
		&item.Description,
		&item.SmartcoinPrice,
		&item.StockQuantity,
		&item.Icon,
		&item.IsActive,
		&createdBy,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, apperrors.NewNotFoundError("Store item")
		}
		log.Printf("store deactivate item failed (id=%d): %v", itemID, err)
		return nil, apperrors.ErrInternal
	}

	if createdBy.Valid {
		v := createdBy.Int32
		item.CreatedBy = &v
	}

	return &item, nil
}

// DeleteItem permanently deletes an item.
func (s *Service) DeleteItem(ctx context.Context, itemID int32) error {
	const query = `DELETE FROM store_items WHERE id = $1`

	cmd, err := s.pool.Exec(ctx, query, itemID)
	if err != nil {
		log.Printf("store hard delete failed (id=%d): %v", itemID, err)
		return apperrors.ErrInternal
	}
	if cmd.RowsAffected() == 0 {
		return apperrors.NewNotFoundError("Store item")
	}

	return nil
}

// EnsureTimeUTC normalizes times for API consistency.
func EnsureTimeUTC(t time.Time) time.Time {
	return t.UTC()
}

type storeItemTx struct {
	Name           string
	SmartcoinPrice int32
	StockQuantity  int32
	IsActive       bool
}

func getUserCoinsForUpdate(ctx context.Context, tx pgx.Tx, userID int32) (int32, error) {
	const query = `SELECT coins FROM users WHERE id = $1 FOR UPDATE`
	var coins int32
	err := tx.QueryRow(ctx, query, userID).Scan(&coins)
	return coins, err
}

func getStoreItemForUpdate(ctx context.Context, tx pgx.Tx, itemID int32) (storeItemTx, error) {
	const query = `
		SELECT name, smartcoin_price, stock_quantity, is_active
		FROM store_items
		WHERE id = $1
		FOR UPDATE`

	var item storeItemTx
	err := tx.QueryRow(ctx, query, itemID).Scan(
		&item.Name,
		&item.SmartcoinPrice,
		&item.StockQuantity,
		&item.IsActive,
	)
	return item, err
}

func deductUserCoinsTx(ctx context.Context, tx pgx.Tx, userID int32, cost int32) (int32, error) {
	const query = `
		UPDATE users
		SET coins = coins - $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING coins`

	var remaining int32
	err := tx.QueryRow(ctx, query, userID, cost).Scan(&remaining)
	return remaining, err
}

func decrementStockTx(ctx context.Context, tx pgx.Tx, itemID int32, quantity int32) (int32, error) {
	const query = `
		UPDATE store_items
		SET stock_quantity = stock_quantity - $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING stock_quantity`

	var remaining int32
	err := tx.QueryRow(ctx, query, itemID, quantity).Scan(&remaining)
	return remaining, err
}

func createPurchaseHistoryTx(
	ctx context.Context,
	tx pgx.Tx,
	userID int32,
	itemID int32,
	quantity int32,
	unitPrice int32,
	totalCost int32,
) (PurchaseHistory, error) {
	const query = `
		INSERT INTO purchase_history (user_id, store_item_id, quantity, unit_price, total_smartcoins)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, store_item_id, quantity, unit_price, total_smartcoins, purchased_at`

	var p PurchaseHistory
	err := tx.QueryRow(ctx, query, userID, itemID, quantity, unitPrice, totalCost).Scan(
		&p.ID,
		&p.UserID,
		&p.StoreItemID,
		&p.Quantity,
		&p.UnitPrice,
		&p.TotalSmartcoins,
		&p.PurchasedAt,
	)
	return p, err
}
