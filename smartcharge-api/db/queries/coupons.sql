-- name: GetCouponCatalog :many
SELECT id, name, description, coin_cost, discount_type, discount_value, icon
FROM coupon_catalog
WHERE active = true
ORDER BY coin_cost ASC;

-- name: GetCouponByID :one
SELECT id, name, description, coin_cost, discount_type, discount_value, icon
FROM coupon_catalog
WHERE id = $1 AND active = true;

-- name: CreateUserCoupon :one
INSERT INTO user_coupons (user_id, coupon_id, code, expires_at)
VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')
RETURNING id, user_id, coupon_id, status, code, created_at, expires_at;

-- name: GetUserActiveCoupons :many
SELECT uc.id, uc.code, uc.status, uc.expires_at,
       cc.name, cc.discount_type, cc.discount_value, cc.icon, uc.coupon_id, uc.created_at
FROM user_coupons uc
JOIN coupon_catalog cc ON cc.id = uc.coupon_id
WHERE uc.user_id = $1 AND uc.status = 'ACTIVE' AND uc.expires_at > NOW()
ORDER BY uc.created_at DESC;

-- name: GetUserCouponByCode :one
SELECT uc.id, uc.user_id, uc.coupon_id, uc.status, uc.code, uc.expires_at,
       cc.name, cc.discount_type, cc.discount_value
FROM user_coupons uc
JOIN coupon_catalog cc ON cc.id = uc.coupon_id
WHERE uc.code = $1 AND uc.user_id = $2;

-- name: MarkCouponUsed :exec
UPDATE user_coupons
SET status = 'USED', used_at = NOW()
WHERE id = $1;

-- name: GetUserCoins :one
SELECT coins FROM users WHERE id = $1;

-- name: DeductUserCoins :one
UPDATE users
SET coins = coins - $2
WHERE id = $1
RETURNING coins;

-- name: GetUserCoinBalance :one
SELECT coins FROM users WHERE id = $1 FOR UPDATE;
