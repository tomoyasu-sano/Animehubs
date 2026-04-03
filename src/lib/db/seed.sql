-- サンプル商品データ（初回デプロイ用）
INSERT OR IGNORE INTO products (id, name_en, name_sv, description_en, description_sv, price, stock, category, condition, images, featured, created_at, updated_at) VALUES
(
  'a0000001-0000-4000-8000-000000000001',
  'Rem - Re:Zero Starting Life in Another World',
  'Rem - Re:Zero Starting Life in Another World',
  '1/7 scale figure of Rem from Re:Zero. Beautiful detailed sculpt with flowing blue hair and maid outfit.',
  '1/7 skalfigur av Rem fran Re:Zero. Vackert detaljerad skulptur med flodande blatt har och hembitradeskladsel.',
  189900,
  1,
  'figures',
  'like_new',
  '["/placeholder/figure-1.svg"]',
  1,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
),
(
  'a0000001-0000-4000-8000-000000000002',
  'Nendoroid Miku Hatsune',
  'Nendoroid Miku Hatsune',
  'Classic Nendoroid of Hatsune Miku with multiple face plates and accessories.',
  'Klassisk Nendoroid av Hatsune Miku med flera ansiktsplattor och tillbehor.',
  89900,
  2,
  'figures',
  'good',
  '["/placeholder/figure-2.svg"]',
  1,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
