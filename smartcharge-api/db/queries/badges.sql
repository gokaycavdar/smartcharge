-- name: ListBadges :many
SELECT * FROM badges ORDER BY name ASC;

-- name: GetBadgeByID :one
SELECT * FROM badges WHERE id = $1;

-- name: CreateBadge :one
INSERT INTO badges (name, description, icon)
VALUES ($1, $2, $3)
RETURNING *;
