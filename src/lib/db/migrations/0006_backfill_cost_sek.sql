-- 第1回バッチ(2026-03-15)の着地原価を価格帯基準で一括投入（öre単位）。
-- 価格帯→仮名→着地原価: 449=A/150.58, 349=B/124.35, 219=C/82.37, 65=D/32.58。
-- cost_sek IS NULL ガードで、手入力済みの原価は上書きしない（再実行安全）。
UPDATE products SET cost_sek = 15058 WHERE price = 44900 AND cost_sek IS NULL;
UPDATE products SET cost_sek = 12435 WHERE price = 34900 AND cost_sek IS NULL;
UPDATE products SET cost_sek = 8237  WHERE price = 21900 AND cost_sek IS NULL;
UPDATE products SET cost_sek = 3258  WHERE price = 6500  AND cost_sek IS NULL;
