-- 000001_init_schema.down.sql
-- Rollback: Drop all tables in reverse dependency order

DROP INDEX IF EXISTS idx_forecasts_station_day_hour;
DROP INDEX IF EXISTS idx_campaigns_status;
DROP INDEX IF EXISTS idx_campaigns_owner_id;
DROP INDEX IF EXISTS idx_reservations_station_id;
DROP INDEX IF EXISTS idx_reservations_user_id;
DROP INDEX IF EXISTS idx_stations_owner_id;

DROP TABLE IF EXISTS station_density_forecasts;
DROP TABLE IF EXISTS campaign_target_badges;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS users;
