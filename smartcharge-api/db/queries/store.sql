-- name: ListActiveStoreItems :many
SELECT id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at
FROM store_items
WHERE is_active = true
ORDER BY smartcoin_price ASC, id ASC;

-- name: GetStoreItemByID :one
SELECT id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at
FROM store_items
WHERE id = $1;

-- name: ListStoreItemsAdmin :many
SELECT id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at
FROM store_items
ORDER BY created_at DESC, id DESC;

-- name: CreateStoreItem :one
INSERT INTO store_items (name, description, smartcoin_price, stock_quantity, icon, is_active, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at;

-- name: UpdateStoreItemPricingStock :one
UPDATE store_items
SET smartcoin_price = $2,
    stock_quantity = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at;

-- name: DeactivateStoreItemByID :one
UPDATE store_items
SET is_active = false,
    updated_at = NOW()
WHERE id = $1
RETURNING id, name, description, smartcoin_price, stock_quantity, icon, is_active, created_by, created_at, updated_at;

-- name: DeleteStoreItemByID :exec
DELETE FROM store_items
WHERE id = $1;

-- name: CreatePurchaseHistory :one
INSERT INTO purchase_history (user_id, store_item_id, quantity, unit_price, total_smartcoins)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, store_item_id, quantity, unit_price, total_smartcoins, purchased_at;

-- name: ListPurchaseHistoryByUser :many
SELECT ph.id,
       ph.user_id,
       ph.store_item_id,
       ph.quantity,
       ph.unit_price,
       ph.total_smartcoins,
       ph.purchased_at,
       si.name,
       si.description,
       si.icon
FROM purchase_history ph
JOIN store_items si ON si.id = ph.store_item_id
WHERE ph.user_id = $1
ORDER BY ph.purchased_at DESC;
