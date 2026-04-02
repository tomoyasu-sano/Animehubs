-- v2: products テーブルにカラム追加
ALTER TABLE products ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;

-- v2: users テーブル
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT,
  email_verified INTEGER,
  role TEXT NOT NULL DEFAULT 'user',
  default_address TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- v2: accounts テーブル（NextAuth）
CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v2: sessions テーブル（NextAuth）
CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v2: verification_tokens テーブル（NextAuth）
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- v2: favorites テーブル
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- v2: orders テーブル
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  order_date TEXT NOT NULL,
  order_seq INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  total_amount INTEGER NOT NULL,
  items TEXT NOT NULL,
  shipping_address TEXT,
  expires_at TEXT,
  cancelled_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
