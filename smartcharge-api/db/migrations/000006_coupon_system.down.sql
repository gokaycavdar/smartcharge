-- Rollback: Drop coupon tables
-- Drop in reverse order due to foreign key constraints

DROP TABLE IF EXISTS user_coupons CASCADE;
DROP TABLE IF EXISTS coupon_catalog CASCADE;
