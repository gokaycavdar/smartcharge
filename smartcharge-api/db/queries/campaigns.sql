-- name: ListCampaignsByOwner :many
SELECT c.id, c.title, c.description, c.status, c.target, c.discount,
       c.end_date, c.owner_id, c.station_id, c.coin_reward, c.created_at, c.updated_at,
       s.name AS station_name
FROM campaigns c
LEFT JOIN stations s ON s.id = c.station_id
WHERE c.owner_id = $1
ORDER BY c.created_at DESC;

-- name: GetCampaignByID :one
SELECT * FROM campaigns WHERE id = $1;

-- name: CreateCampaign :one
INSERT INTO campaigns (title, description, status, target, discount, end_date, owner_id, station_id, coin_reward)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateCampaign :one
UPDATE campaigns
SET title = $2, description = $3, status = $4, target = $5, discount = $6,
    end_date = $7, station_id = $8, coin_reward = $9, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteCampaign :exec
DELETE FROM campaigns WHERE id = $1;

-- name: GetActiveCampaignsForStation :many
SELECT * FROM campaigns
WHERE status = 'ACTIVE'
  AND (end_date IS NULL OR end_date >= NOW())
  AND (station_id = $1 OR station_id IS NULL)
ORDER BY created_at DESC;

-- name: ListActiveCampaigns :many
SELECT * FROM campaigns
WHERE status = 'ACTIVE'
ORDER BY coin_reward DESC;

-- name: GetCampaignTargetBadges :many
SELECT b.id, b.name, b.description, b.icon
FROM badges b
JOIN campaign_target_badges ctb ON ctb.badge_id = b.id
WHERE ctb.campaign_id = $1;

-- name: AddCampaignTargetBadge :exec
INSERT INTO campaign_target_badges (campaign_id, badge_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveCampaignTargetBadges :exec
DELETE FROM campaign_target_badges WHERE campaign_id = $1;
