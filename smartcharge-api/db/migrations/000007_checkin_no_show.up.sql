-- Phase 11: Appointment check-in and no-show lifecycle

ALTER TABLE stations
ADD COLUMN qr_secret VARCHAR(128) NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text);

ALTER TABLE reservations
ADD COLUMN checked_in_at TIMESTAMPTZ,
ADD COLUMN check_in_method VARCHAR(20),
ADD COLUMN no_show_at TIMESTAMPTZ;

ALTER TABLE reservations
ADD CONSTRAINT chk_reservations_status_lifecycle
CHECK (status IN ('PENDING', 'CONFIRMED', 'CHARGING', 'COMPLETED', 'CANCELLED', 'FAILED', 'NO_SHOW'));

ALTER TABLE reservations
ADD CONSTRAINT chk_reservations_check_in_method
CHECK (check_in_method IS NULL OR check_in_method IN ('GEOLOCATION', 'QR'));

CREATE INDEX idx_reservations_status_date_hour ON reservations (status, date, hour);
