-- Store system phase 1: catalog + purchase history

CREATE TABLE store_items (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    smartcoin_price  INT NOT NULL CHECK (smartcoin_price > 0),
    stock_quantity   INT NOT NULL CHECK (stock_quantity >= 0),
    icon             VARCHAR(50) NOT NULL DEFAULT '*',
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_by       INT REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_history (
    id                SERIAL PRIMARY KEY,
    user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_item_id     INT NOT NULL REFERENCES store_items(id) ON DELETE RESTRICT,
    quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price        INT NOT NULL CHECK (unit_price > 0),
    total_smartcoins  INT NOT NULL CHECK (total_smartcoins > 0),
    purchased_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_items_active_price ON store_items (is_active, smartcoin_price);
CREATE INDEX idx_purchase_history_user_time ON purchase_history (user_id, purchased_at DESC);
CREATE INDEX idx_purchase_history_item_time ON purchase_history (store_item_id, purchased_at DESC);
