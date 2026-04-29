-- SmartCoin Coupon System: Allows users to convert coins into discount coupons

-- Kupon katalogı: Operator tarafından tanımlanır
CREATE TABLE coupon_catalog (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    coin_cost       INT NOT NULL CHECK (coin_cost > 0),
    discount_type   VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value  FLOAT NOT NULL CHECK (discount_value > 0),
    icon            VARCHAR(10) NOT NULL DEFAULT '🎟️',
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Kullanıcının sahip olduğu kuponlar
CREATE TABLE user_coupons (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id       INT NOT NULL REFERENCES coupon_catalog(id) ON DELETE RESTRICT,
    status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED')),
    code            VARCHAR(50) NOT NULL UNIQUE,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

-- Create indexes separately (PostgreSQL syntax)
CREATE INDEX idx_user_coupons_user ON user_coupons (user_id, status);
CREATE INDEX idx_user_coupons_active ON user_coupons (user_id, status, expires_at);
CREATE INDEX idx_user_coupons_code ON user_coupons (code);

-- Seed: Örnek kupon kataloğu
INSERT INTO coupon_catalog (name, description, coin_cost, discount_type, discount_value, icon, active)
VALUES
    ('%10 İndirim', 'Şarj işleminde %10 indirim', 500, 'percentage', 10, '🎟️', true),
    ('%20 İndirim', 'Şarj işleminde %20 indirim', 1000, 'percentage', 20, '✨', true),
    ('50 TL İndirim', 'Şarj işleminde sabit 50 TL indirim', 800, 'fixed', 50, '💳', true),
    ('100 TL İndirim', 'Şarj işleminde sabit 100 TL indirim', 1500, 'fixed', 100, '💰', true),
    ('200 TL İndirim', 'Şarj işleminde sabit 200 TL indirim', 2500, 'fixed', 200, '🏆', true);
