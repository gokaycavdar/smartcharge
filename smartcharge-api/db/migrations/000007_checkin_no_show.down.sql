DROP INDEX IF EXISTS idx_reservations_status_date_hour;

ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS chk_reservations_check_in_method;

ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS chk_reservations_status_lifecycle;

ALTER TABLE reservations
DROP COLUMN IF EXISTS no_show_at,
DROP COLUMN IF EXISTS check_in_method,
DROP COLUMN IF EXISTS checked_in_at;

ALTER TABLE stations
DROP COLUMN IF EXISTS qr_secret;
