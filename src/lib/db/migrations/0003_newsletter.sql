-- ニュースレター購読者テーブル
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- サイト告知バナーテーブル
CREATE TABLE IF NOT EXISTS site_announcements (
  id TEXT PRIMARY KEY NOT NULL,
  message_en TEXT NOT NULL,
  message_sv TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ニュースレター送信履歴テーブル
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id TEXT PRIMARY KEY NOT NULL,
  subject_en TEXT NOT NULL,
  subject_sv TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_sv TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending',
  sent_by TEXT NOT NULL,
  sent_at TEXT NOT NULL
);
