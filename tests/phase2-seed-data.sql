-- =============================================================
-- Phase 2 テスト用シードデータ
-- =============================================================
-- 使い方:
--   npx wrangler d1 execute animehubs-db --local --file=tests/phase2-seed-data.sql
--
-- 既存データをクリーンアップしてから投入する。
-- テスト後のリセットにも同じファイルを再実行すればOK。
-- =============================================================

-- クリーンアップ（外部キー制約の順序に注意）
DELETE FROM favorites;
DELETE FROM orders;
DELETE FROM reservations;
DELETE FROM products;

-- =============================================================
-- 商品データ（6件: 通常在庫 / 残りわずか / 在庫切れ を網羅）
-- =============================================================

INSERT INTO products (id, name_en, name_sv, description_en, description_sv, price, stock, reserved_stock, category, condition, images, featured, likes_count, created_at, updated_at) VALUES
-- 1) 通常在庫（stock=10）
(
  'test-prod-001',
  'Rem - Re:Zero 1/7 Scale Figure',
  'Rem - Re:Zero 1/7 Skalfigur',
  'Beautiful 1/7 scale figure of Rem from Re:Zero.',
  'Vacker 1/7 skalfigur av Rem fran Re:Zero.',
  189900,
  10,
  0,
  'scale-figures',
  'like_new',
  '["/placeholder/figure-1.svg"]',
  1,
  5,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
),
-- 2) 通常在庫（stock=5）
(
  'test-prod-002',
  'Nendoroid Miku Hatsune',
  'Nendoroid Miku Hatsune',
  'Classic Nendoroid of Hatsune Miku with accessories.',
  'Klassisk Nendoroid av Hatsune Miku med tillbehor.',
  89900,
  5,
  0,
  'nendoroids',
  'good',
  '["/placeholder/figure-2.svg"]',
  1,
  3,
  '2026-01-15T00:00:00.000Z',
  '2026-01-15T00:00:00.000Z'
),
-- 3) 残りわずか（stock=3, reserved=1 → 実質2個）
(
  'test-prod-003',
  'Nezuko Kamado - Demon Slayer',
  'Nezuko Kamado - Demon Slayer',
  'Nezuko figure in bamboo muzzle pose.',
  'Nezuko-figur i bambu-munkavlepose.',
  149900,
  3,
  1,
  'scale-figures',
  'like_new',
  '["/placeholder/figure-1.svg"]',
  0,
  8,
  '2026-02-01T00:00:00.000Z',
  '2026-02-01T00:00:00.000Z'
),
-- 4) 残りわずか（stock=2, reserved=0 → 実質2個）
(
  'test-prod-004',
  'Gojo Satoru - Jujutsu Kaisen',
  'Gojo Satoru - Jujutsu Kaisen',
  'Gojo figure with Infinite Void pose.',
  'Gojo-figur med Infinite Void-pose.',
  219900,
  2,
  0,
  'scale-figures',
  'good',
  '["/placeholder/figure-2.svg"]',
  0,
  12,
  '2026-02-15T00:00:00.000Z',
  '2026-02-15T00:00:00.000Z'
),
-- 5) 在庫切れ（stock=0）
(
  'test-prod-005',
  'Zero Two - Darling in the Franxx',
  'Zero Two - Darling in the Franxx',
  'Zero Two in pilot suit, SOLD OUT.',
  'Zero Two i pilotkostym, SLUTSALD.',
  299900,
  0,
  0,
  'scale-figures',
  'like_new',
  '["/placeholder/figure-1.svg"]',
  0,
  20,
  '2026-03-01T00:00:00.000Z',
  '2026-03-01T00:00:00.000Z'
),
-- 6) 在庫切れ（stock=1, reserved=1 → 実質0個）
(
  'test-prod-006',
  'Levi Ackerman - Attack on Titan',
  'Levi Ackerman - Attack on Titan',
  'Levi figure, last one reserved.',
  'Levi-figur, sista reserverad.',
  179900,
  1,
  1,
  'scale-figures',
  'good',
  '["/placeholder/figure-2.svg"]',
  0,
  15,
  '2026-03-15T00:00:00.000Z',
  '2026-03-15T00:00:00.000Z'
);
