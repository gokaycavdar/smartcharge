-- name: ListStations :many
SELECT s.id, s.name, s.lat, s.lng, s.price, s.density, s.owner_id, s.address, s.density_profile,
       u.name AS owner_name
FROM stations s
LEFT JOIN users u ON u.id = s.owner_id
ORDER BY s.id ASC;

-- name: GetStationByID :one
SELECT * FROM stations WHERE id = $1;

-- name: CreateStation :one
INSERT INTO stations (name, lat, lng, address, price, owner_id, density_profile)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateStation :one
UPDATE stations
SET name = COALESCE($2, name),
    lat = COALESCE($3, lat),
    lng = COALESCE($4, lng),
    address = COALESCE($5, address),
    price = COALESCE($6, price)
WHERE id = $1
RETURNING *;

-- name: DeleteStation :exec
DELETE FROM stations WHERE id = $1;

-- name: ListStationsByOwner :many
SELECT s.id, s.name, s.lat, s.lng, s.address, s.price, s.density, s.density_profile, s.owner_id
FROM stations s
WHERE s.owner_id = $1
ORDER BY s.id ASC;

-- name: UpdateStationDensity :exec
UPDATE stations SET density = $2 WHERE id = $1;
