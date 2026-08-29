CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  name_en TEXT NOT NULL,
  channel TEXT NOT NULL,
  sold_price INTEGER NOT NULL,
  cost_sek INTEGER,
  seller_fee INTEGER NOT NULL DEFAULT 0,
  seller_shipping INTEGER NOT NULL DEFAULT 0,
  profit INTEGER NOT NULL,
  sold_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sales_sold_at ON sales (sold_at);
CREATE INDEX idx_sales_channel ON sales (channel);
