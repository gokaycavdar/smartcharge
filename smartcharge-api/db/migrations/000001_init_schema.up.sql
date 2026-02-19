-- 000001_init_schema.up.sql
-- SmartCharge EV Charging Ecosystem - Initial Schema

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'DRIVER',
    coins       INT          NOT NULL DEFAULT 0,
    co2_saved   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    xp          INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    address         VARCHAR(500),
    price           DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    density         INT NOT NULL DEFAULT 0,
    owner_id        INT REFERENCES users(id),
    density_profile VARCHAR(20) NOT NULL DEFAULT 'suburban'
);

CREATE TABLE IF NOT EXISTS reservations (
    id           SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(id),
    station_id   INT NOT NULL REFERENCES stations(id),
    date         TIMESTAMPTZ NOT NULL,
    hour         VARCHAR(20) NOT NULL,
    is_green     BOOLEAN NOT NULL DEFAULT FALSE,
    earned_coins INT     NOT NULL DEFAULT 0,
    saved_co2    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS badges (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon        VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
    user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    target      VARCHAR(255) NOT NULL DEFAULT '',
    discount    VARCHAR(100) NOT NULL DEFAULT '',
    end_date    TIMESTAMPTZ,
    owner_id    INT NOT NULL REFERENCES users(id),
    station_id  INT REFERENCES stations(id),
    coin_reward INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_target_badges (
    campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    badge_id    INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, badge_id)
);

CREATE TABLE IF NOT EXISTS station_density_forecasts (
    id             SERIAL PRIMARY KEY,
    station_id     INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    day_of_week    INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    hour           INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
    predicted_load INT NOT NULL CHECK (predicted_load >= 0 AND predicted_load <= 100),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, day_of_week, hour)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_stations_owner_id ON stations(owner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_station_id ON reservations(station_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_id ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_forecasts_station_day_hour ON station_density_forecasts(station_id, day_of_week, hour);
