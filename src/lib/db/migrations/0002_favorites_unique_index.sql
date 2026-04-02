-- Phase 2: Add UNIQUE constraint on favorites (user_id, product_id)
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product_unique ON favorites (user_id, product_id);
