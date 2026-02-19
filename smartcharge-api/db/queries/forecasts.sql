-- name: GetForecastsByDayHour :many
SELECT f.id, f.station_id, f.day_of_week, f.hour, f.predicted_load,
       s.name AS station_name, s.lat, s.lng, s.price, s.address, s.density_profile
FROM station_density_forecasts f
JOIN stations s ON s.id = f.station_id
WHERE f.day_of_week = $1 AND f.hour = $2
ORDER BY f.predicted_load ASC;

-- name: GetForecastForStation :one
SELECT predicted_load FROM station_density_forecasts
WHERE station_id = $1 AND day_of_week = $2 AND hour = $3;

-- name: UpsertForecast :exec
INSERT INTO station_density_forecasts (station_id, day_of_week, hour, predicted_load)
VALUES ($1, $2, $3, $4)
ON CONFLICT (station_id, day_of_week, hour)
DO UPDATE SET predicted_load = $4, updated_at = NOW();
