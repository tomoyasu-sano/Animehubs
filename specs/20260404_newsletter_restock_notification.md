# 仕様書: 新商品入荷通知（ニュースレター型）

作成日: 2026-04-04
更新日: 2026-04-04（レビュー指摘 R1:12件 + R2:13件 修正）
ステータス: **ドラフト**

---

## 1. 概要

### 背景・目的

AnimeHubsは日本からアニメグッズを大量輸入して販売するモデル。商品は1点もののため、入荷タイミングが不定期。入荷時にサイト訪問がなければ機会損失になる。

「新商品が届いた」ことをメールで通知し、再訪問・購入を促すニュースレター型の仕組みを実装する。商品単位ではなく、入荷イベント単位での一斉通知。

### ゴール

- 売り切れ → 再入荷時の機会損失を防ぐ
- メールマーケティングで購買を促進
- 登録ハードルを低く（Googleログインのみ）

### スコープ

| 含む | 含まない（将来検討） |
|------|-------------------|
| トップページ告知バナー | メール開封率トラッキング |
| Googleログインベースの通知登録 | セグメント配信 |
| 管理者によるメール一斉送信 | 送信スケジュール予約 |
| 新商品の自動挿入 | テンプレート保存・再利用 |
| 配信停止（メールフッターから） | A/Bテスト |
| テスト送信（管理者のみ） | — |

---

## 2. ユーザーフロー

### 2-1. 通知登録フロー

```
ユーザーがトップページにアクセス
  │
  ├─ 告知バナーが表示される（管理者が有効にしている場合）
  │    「🎉 6月15日に新商品販売開始！」
  │    [新商品の通知を受け取る] ← ボタン
  │
  ├─ ボタン押下
  │    ├─ 未ログイン
  │    │    → Googleログイン画面へ（callbackUrl=トップページ?subscribe=true）
  │    │    → ログイン成功後、トップページに戻る
  │    │    → subscribe=true を検出し、確認ダイアログ表示:
  │    │      「新商品の入荷通知メールを受け取りますか？」[はい] [いいえ]
  │    │    → 「はい」で登録 →「登録しました！」トースト表示
  │    │    → 「いいえ」で何もしない
  │    │
  │    ├─ ログイン済み＆未登録
  │    │    → ワンクリックで登録
  │    │    → 「登録しました！」トースト表示
  │    │    ※ボタンテキスト自体が「Notify me of new arrivals」であり、
  │    │      クリック = メール受信への明示的同意（GDPR対応）
  │    │
  │    └─ ログイン済み＆登録済み
  │         → ボタンが「Subscribed ✓」に変わっている（表示のみ、解除機能なし）
  │         → 解除はメールフッターの配信停止リンクからのみ
```

**GDPR対応**: スウェーデン＝EU圏のため、メール受信には明示的な同意が必要。
- ログイン済みユーザー: ボタンテキストを同意行為と見なせる文言にする（「Notify me of new arrivals」）
- 未ログインユーザー: ログイン後に確認ダイアログを表示し、明示的な同意を取得
- いずれの場合も「自動登録」は行わない

### 2-2. メール受信フロー

```
管理者が新商品を登録（/admin/products/new で商品を順次登録）
  → 商品登録が一通り完了
  → 管理画面でメール送信画面を開く（/admin/newsletter）
  → 件名・本文を入力 or 新商品自動挿入
  → [テスト送信] で管理者自身にテストメール送信
  → メールクライアントで表示確認
  → 「送信」→ 確認ダイアログ「○○名に送信します。よろしいですか？」
  → Resendで一斉送信
  → 送信結果表示（成功数/失敗数）

※ 商品登録とメール送信は連動しない。管理者が任意のタイミングで手動送信する。

ユーザーがメールを受信
  → 新商品一覧が表示される
  → 「Shop Now」ボタンでサイトへ
  → フッターに配信停止リンク
```

### 2-3. 配信停止フロー

**メールフッターからのみ**:

```
メールフッターの「Unsubscribe」リンクをクリック
  → /[locale]/unsubscribe?token=<signed_token> にアクセス
  → トークン検証（署名＋有効期限）
  → 成功: 「配信を停止しました。再登録はサイトから可能です。」表示
  → 期限切れ: 「リンクの有効期限が切れました。サイトにログインして
              トップページの通知ボタンから再登録後、次のメールで解除できます。」表示
```

サイト上の「Subscribed ✓」ボタンからの解除機能は設けない（メールフッターで十分）。

---

## 3. 画面設計

### 3-1. トップページ告知バナー

**配置**: Featured Items セクションの直上

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   🎉 New items arriving June 15!          [Get notified] │
│                                                          │
└──────────────────────────────────────────────────────────┘

  ▼ Featured Items（既存）
  ┌─────┐ ┌─────┐ ┌─────┐
  │     │ │     │ │     │
  └─────┘ └─────┘ └─────┘
```

**状態別表示**:

| 状態 | バナー表示 |
|------|----------|
| バナー無効（管理者OFF） | バナー非表示 |
| バナー有効＆未ログイン | テキスト + 「Get notified」ボタン |
| バナー有効＆ログイン済み＆未登録 | テキスト + 「Notify me of new arrivals」ボタン |
| バナー有効＆ログイン済み＆登録済み | テキスト + 「Subscribed ✓」（クリック不可） |

**デザイン方針**:
- 背景: ブランドカラーの薄いグラデーション or アクセントカラー
- テキスト: 左寄せ、ボタン: 右寄せ
- レスポンシブ: モバイルではテキスト上・ボタン下の縦積み
- 多言語: テキスト・ボタンラベルともに en/sv 対応

### 3-2. 管理画面 — 告知バナー設定

**配置**: `/admin` ダッシュボードに「告知バナー」セクション追加

```
┌─ 告知バナー設定 ──────────────────────────────┐
│                                              │
│  表示: [ON / OFF トグル]                      │
│                                              │
│  英語メッセージ:                              │
│  ┌──────────────────────────────────────┐    │
│  │ New items arriving June 15!          │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  スウェーデン語メッセージ:                     │
│  ┌──────────────────────────────────────┐    │
│  │ Nya varor kommer 15 juni!            │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [保存]                                      │
│                                              │
│  📊 通知登録者数: 42名                        │
└──────────────────────────────────────────────┘
```

### 3-3. 管理画面 — メール一斉送信

**配置**: `/admin/newsletter` 新規ページ

```
┌─ メール一斉送信 ──────────────────────────────┐
│                                              │
│  送信先: 42名の登録者                         │
│                                              │
│  件名 (EN): ┌──────────────────────────┐     │
│             │ New anime goods arrived!  │     │
│             └──────────────────────────┘     │
│  件名 (SV): ┌──────────────────────────┐     │
│             │ Nya anime-varor har ...   │     │
│             └──────────────────────────┘     │
│                                              │
│  本文 (EN): ┌──────────────────────────┐     │
│             │ We just received a fresh  │     │
│             │ batch of anime goods ...  │     │
│             └──────────────────────────┘     │
│  本文 (SV): ┌──────────────────────────┐     │
│             │ Vi har precis fått ...    │     │
│             └──────────────────────────┘     │
│                                              │
│  ☐ 最近追加した商品を自動挿入（直近7日間）     │
│                                              │
│  [テスト送信]  [プレビュー]  [送信]            │
│                                              │
│  ─── 送信履歴 ───                             │
│  | 日時       | 件名                | 送信数 | │
│  | 2026-04-04 | New anime goods ... | 42    | │
│  | 2026-03-28 | Spring collection!  | 38    | │
│  （クリックで詳細表示: 件名・本文・送信数を閲覧）│
└──────────────────────────────────────────────┘
```

**「最近追加した商品を自動挿入」チェック時**:
- `created_at` が直近7日以内の商品を自動取得
- **基準タイムゾーン**: UTC（products.created_at が UTC で保存されているため）
- 商品画像・名前・価格をメール本文に挿入
- 管理者の本文テキストの後に商品リストが追加される

**テスト送信**:
- 「テスト送信」ボタンで管理者自身のメールアドレスに1通送信
- 実際のメールクライアントで表示確認が可能
- プレビューでは確認できないレイアウト崩れ等を事前に検出
- テスト送信の頻度制限: 1分あたり5回まで（Resend APIレート制限に準拠）

---

## 4. データモデル

### 4-1. 新規テーブル

#### `newsletter_subscribers`

```sql
CREATE TABLE newsletter_subscribers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

- `user_id` に UNIQUE 制約 → 1ユーザー1登録
- `ON DELETE CASCADE` → ユーザー削除時に自動削除
- **email カラムは持たない**: メール送信時は常に `users` テーブルを JOIN して最新のメールアドレスを取得する。`ON DELETE CASCADE` によりユーザー削除時に subscriber も消えるため、フォールバック用の email は不要

#### `site_announcements`

```sql
CREATE TABLE site_announcements (
  id TEXT PRIMARY KEY,
  message_en TEXT NOT NULL,
  message_sv TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- **active の排他制御**: PUT API で `active=1` にする際、`db.batch()` を使って他レコードの `active=0` 更新と対象レコードの更新を原子的に実行する（D1 は BEGIN/COMMIT 非対応のため `db.batch()` を使用。プロジェクト内の `order-queries.ts` と同じパターン）
- **同時実行リスク**: 管理者が1名のため、同時更新の競合リスクは許容する

#### `newsletter_sends`（送信履歴）

```sql
CREATE TABLE newsletter_sends (
  id TEXT PRIMARY KEY,
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
```

- **recipient_count**: 送信対象者数（試行数）
- **sent_count**: Resend API が成功を返した数
- **failed_count**: Resend API がエラーを返した数
- **status**: `sending` | `completed` | `partial_failure` | `failed`
- **sent_by**: 送信した管理者のメールアドレス（操作者追跡）

### 4-2. Drizzle スキーマ定義

```typescript
// src/lib/db/schema.ts に追加

export const newsletterSubscribers = sqliteTable("newsletter_subscribers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique()
    .references(() => users.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
});

export const siteAnnouncements = sqliteTable("site_announcements", {
  id: text("id").primaryKey(),
  messageEn: text("message_en").notNull(),
  messageSv: text("message_sv").notNull(),
  active: integer("active").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const newsletterSends = sqliteTable("newsletter_sends", {
  id: text("id").primaryKey(),
  subjectEn: text("subject_en").notNull(),
  subjectSv: text("subject_sv").notNull(),
  bodyEn: text("body_en").notNull(),
  bodySv: text("body_sv").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  status: text("status").notNull().default("sending"),
  sentBy: text("sent_by").notNull(),
  sentAt: text("sent_at").notNull(),
});

export type NewsletterSendStatus = "sending" | "completed" | "partial_failure" | "failed";
```

---

## 5. API設計

### 5-0. 共通事項

**認証**: 管理者APIはすべて `getAdminSession()`（`admin-auth.ts`、NextAuth v5 ベース）を使用。旧JWT認証（`auth.ts`）は使用しない（410 Gone 状態）。

**入力バリデーション**:

| フィールド | 制約 |
|-----------|------|
| 件名（subjectEn/subjectSv） | 必須、最大200文字 |
| 本文（bodyEn/bodySv） | 必須、最大10,000文字 |
| バナーメッセージ（messageEn/messageSv） | 必須、最大500文字 |
| locale | `"en"` または `"sv"` のみ |
| recentProductsDays | 1〜30の整数 |

### 5-1. ユーザー向けAPI

#### `GET /api/newsletter/status`

登録状態確認。

- **認証**: 任意（未ログインなら `{ subscribed: false }`）
- **レスポンス**: `{ subscribed: boolean }`

#### `POST /api/newsletter/subscribe`

通知登録。

- **認証**: 必須（ログイン済みユーザー）
- **リクエスト**: `{ locale: "en" | "sv" }`
- **処理**: セッションから user_id を取得 → `newsletter_subscribers` に INSERT
- **レスポンス**: `{ subscribed: true, alreadySubscribed: false }` （新規登録）
- **既に登録済みの場合**: 冪等に `200 { subscribed: true, alreadySubscribed: true }` を返す。locale が異なる場合は更新する

#### `GET /api/newsletter/unsubscribe`

メールフッターからの配信停止。

- **認証**: 不要（トークンで認証）
- **クエリパラメータ**: `?token=<signed_token>`
- **処理**: トークン検証（署名＋有効期限）→ `newsletter_subscribers` から DELETE
- **レスポンス**: 配信停止完了ページへリダイレクト
- **注**: GET メソッドを使用（メールリンクから直接アクセスするため。Cloudflare Workers で DELETE + body の組み合わせが問題になる可能性を回避）

#### `GET /api/announcements/active`

有効な告知バナーを取得。

- **認証**: 不要
- **レスポンス**: `{ announcement: { messageEn, messageSv } | null }`
- **複数 active 時**: `updated_at` が最新の1件のみ返す

### 5-2. 管理者向けAPI

#### `GET /api/admin/newsletter/subscribers`

登録者一覧・統計。

- **認証**: `getAdminSession()` 必須
- **レスポンス**: `{ count: number, subscribers: Array<{ email, locale, createdAt }> }`
- **注**: email は `users` テーブルから JOIN で取得

#### `PUT /api/admin/announcements`

告知バナー更新。

- **認証**: `getAdminSession()` 必須
- **リクエスト**: `{ messageEn, messageSv, active }`
- **処理**: upsert。`active=1` にする場合、`db.batch()` で他レコードの `active=0` 更新と対象レコードの更新を原子的に実行
- **レスポンス**: `{ success: true }`

#### `POST /api/admin/newsletter/send`

メール一斉送信。

- **認証**: `getAdminSession()` 必須
- **リクエスト**:
  ```json
  {
    "subjectEn": "New anime goods just arrived!",
    "subjectSv": "Nya anime-varor har anlänt!",
    "bodyEn": "We just received ...",
    "bodySv": "Vi har precis fått ...",
    "includeRecentProducts": true,
    "recentProductsDays": 7,
    "testMode": false
  }
  ```
- **testMode**: `true` の場合、管理者自身のメールアドレスにのみ送信。レート制限・重複送信防止の対象外
- **処理**:
  1. `newsletter_subscribers` と `users` テーブルを JOIN し、最新のメールアドレスを取得
  2. locale ごとにグループ化
  3. `includeRecentProducts: true` なら直近N日（UTC基準）の商品を取得
  4. Resend Batch API で送信（`batchValidation: 'permissive'`、1バッチ100件、バッチ間500ms待機）
  5. `newsletter_sends` に履歴保存（sent_count/failed_count/status を更新）
- **レスポンス**: `{ success: true, sent: number, failed: number }`
- **重複送信防止**: `newsletter_sends.sent_at` をDBクエリで確認。直近1時間以内に `status != 'failed'` のレコードがあれば 429 を返す
- **タイムアウト対策**: 詳細は「6-3. スケーラビリティ」参照

#### `GET /api/admin/newsletter/sends`

送信履歴一覧。

- **認証**: `getAdminSession()` 必須
- **クエリパラメータ**: `?limit=20&offset=0`（ページネーション）
- **レスポンス（一覧）**: `{ sends: Array<{ id, subjectEn, recipientCount, sentCount, failedCount, status, sentBy, sentAt }>, total: number }`
- **本文は一覧に含めない**: body_en/body_sv は大きいため、詳細APIで取得

#### `GET /api/admin/newsletter/sends/[id]`

送信履歴詳細。

- **認証**: `getAdminSession()` 必須
- **レスポンス**: `{ id, subjectEn, subjectSv, bodyEn, bodySv, recipientCount, sentCount, failedCount, status, sentBy, sentAt }`

---

## 6. メール設計

### 6-1. ニュースレターメール

**テンプレート方式**: 既存のメール実装（`send-order-email.ts`）と同様にインラインHTMLビルドを使用。react-email コンポーネントは使わない（既存コードとの一貫性を優先）。

**件名**: 管理者が自由に設定

**本文構成**:

```
┌─────────────────────────────────────┐
│  [AnimeHubs ロゴ]                    │
│                                     │
│  管理者のメッセージテキスト            │
│                                     │
│  ─── New Arrivals ───               │
│                                     │
│  [商品画像] 商品名        SEK 299   │
│  [商品画像] 商品名        SEK 499   │
│  [商品画像] 商品名        SEK 199   │
│  ...                                │
│                                     │
│  [  Shop Now →  ]                   │
│                                     │
│  ─────────────────────────────────  │
│  AnimeHubs — Uppsala, Sweden        │
│  Unsubscribe                        │
└─────────────────────────────────────┘
```

### 6-2. 配信停止リンクの仕組み

**署名鍵**: `NEWSLETTER_HMAC_SECRET` 環境変数を新設する。`JWT_SECRET`（旧管理者認証で使用）とは分離する。

**トークン生成**:

```
ペイロード = user_id + ":" + expires_timestamp
トークン = Base64URL(ペイロード) + "." + HMAC-SHA256(ペイロード, NEWSLETTER_HMAC_SECRET)
```

- `expires_timestamp`: 生成時刻 + 30日（有効期限）
- URL: `/[locale]/unsubscribe?token=<signed_token>`
  - locale は `[locale]` ルートセグメントで決定（既存の next-intl ルーティングに準拠）
- トークン検証手順:
  1. Base64URLデコードしてペイロードを取得
  2. HMAC-SHA256 で署名を検証（`NEWSLETTER_HMAC_SECRET` を使用）
  3. `expires_timestamp` が現在時刻より未来であることを確認
  4. 検証成功 → `newsletter_subscribers` から該当 `user_id` を削除
- 有効期限切れの場合: 「リンクの有効期限が切れました。サイトにログインしてトップページの通知ボタンから再登録後、次のメールで解除できます。」と表示

### 6-3. スケーラビリティ

**Cloudflare Workers の制約**:
- CPU時間: 30秒（Paid プラン）
- Workers はリクエストごとにタイムアウトがある

**送信戦略**:

| 登録者数 | 方式 |
|---------|------|
| 〜100人 | 1バッチで同期送信（API Route 内で完結） |
| 101〜500人 | 複数バッチ（100件×N）を順次送信。バッチ間500ms待機 |
| 500人超 | **将来対応**: Cloudflare Queues または Cron Trigger で非同期化 |

**現時点の想定**: 初期は登録者100人以下を想定。500人を超える前にキュー方式に移行する。`newsletter_sends.status` で送信の進捗を管理し、部分成功にも対応可能な設計とする。

### 6-4. エラーハンドリング・リトライ

**Resend Batch API の仕様**:
- `resend.batch.send(emails, { batchValidation: 'permissive' })` を使用
- レスポンス:
  - `response.data`: 成功した送信のID配列 `{ id: string }[]`
  - `response.errors`: 失敗した送信の配列 `{ index: number, message: string }[]`
  - `response.error`: バッチ全体のエラー（ネットワークエラー等）

**集計ロジック**:

```
バッチ1（100件）送信
  → response.error が null:
      sent_count += response.data.length
      failed_count += (response.errors?.length ?? 0)
  → response.error が non-null:
      failed_count += バッチ件数
      ログ記録

バッチ2（100件）送信
  → 同上

全バッチ完了後:
  → failed_count == 0 → status = "completed"
  → failed_count > 0 && sent_count > 0 → status = "partial_failure"
  → sent_count == 0 → status = "failed"
```

- **リトライ**: 初期実装ではリトライしない。失敗分は管理画面に表示され、管理者が判断する

---

## 7. locale の扱い

### 方針: メール送信時に users テーブルは参照しない（locale 列なし）

`newsletter_subscribers.locale` を正とする。ただし、ユーザーがサイトの言語を切り替えた後に通知ボタンを再度操作した場合に locale を更新する。

**更新タイミング**:
- `POST /api/newsletter/subscribe` が呼ばれた際、既に登録済みなら `locale` のみ更新して `200 { subscribed: true, alreadySubscribed: true }` を返す
- これにより、ログイン済みユーザーがバナーのボタンを押すだけで locale が現在の言語に同期される

**理由**: users テーブルに locale カラムを追加する方法もあるが、現時点では newsletter 以外で locale を保持する用途がないため、最小限の変更に留める。

---

## 8. セキュリティ

| 項目 | 対策 |
|------|------|
| 認証 | 登録にはGoogleログイン必須。管理者APIは `getAdminSession()`（NextAuth v5）で検証 |
| GDPR | 未ログインユーザーにはログイン後に確認ダイアログで明示的同意を取得。ログイン済みはボタンテキストが同意行為 |
| 配信停止トークン | HMAC-SHA256（専用鍵 `NEWSLETTER_HMAC_SECRET`）+ 有効期限30日 |
| 署名鍵の分離 | `JWT_SECRET`（旧管理者認証）と `NEWSLETTER_HMAC_SECRET`（配信停止）を分離 |
| 重複送信防止 | `newsletter_sends.sent_at` をDBクエリで確認。直近1時間以内に `status != 'failed'` なら 429 |
| メール送信 | Resend Batch API（`batchValidation: 'permissive'`）で送信。1バッチ100件 |
| 個人情報 | 登録者メールは管理画面でのみ閲覧可。一般APIでは非公開 |
| スパム対策 | Googleログイン必須のため、使い捨てメール登録を防止 |
| 入力バリデーション | 件名200文字、本文10,000文字、バナー500文字の上限 |

---

## 9. 環境変数

| 変数名 | 用途 | 追加/既存 |
|--------|------|----------|
| `RESEND_API_KEY` | Resend メール送信 | 既存 |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス | 既存 |
| `NEWSLETTER_HMAC_SECRET` | 配信停止トークンの署名鍵 | **新規** |

`NEWSLETTER_HMAC_SECRET` は本番環境（Cloudflare Workers の secrets）とローカル環境（`.dev.vars`）の両方に設定する。

---

## 10. 実装計画

### Phase 1: DB・API・バナー（基盤）

1. `NEWSLETTER_HMAC_SECRET` 環境変数を設定
2. DBマイグレーション追加（3テーブル）
3. Drizzle スキーマ定義
4. ニュースレターAPI実装（subscribe / unsubscribe / status）— 冪等な subscribe、GET ベースの unsubscribe
5. 告知バナーAPI実装（`db.batch()` による排他制御）
6. トップページに告知バナーUI追加
7. 未ログイン時のGoogleログイン→確認ダイアログ→登録フロー（GDPR対応）

### Phase 2: 管理画面・メール送信

8. 管理画面に告知バナー設定UI追加
9. 管理画面にメール送信ページ追加（`/admin/newsletter`）
10. メールテンプレート作成（インラインHTMLビルド、既存パターン踏襲）
11. テスト送信機能
12. Resend Batch API連携（`permissive` モード、バッチ分割・エラーハンドリング）
13. 送信履歴の保存・一覧（ページネーション）・詳細表示

### Phase 3: 配信停止・仕上げ

14. 有効期限付き HMAC トークン生成・検証（`NEWSLETTER_HMAC_SECRET` 使用）
15. 配信停止ページ（`/[locale]/unsubscribe`）— next-intl ルーティングに準拠
16. メールフッターに配信停止リンク追加
17. 多言語対応（en/sv のメッセージ・UIテキスト）
18. テスト

### 見積もり

- 新規テーブル: 3
- 新規APIエンドポイント: 9（sends/[id] 追加）
- 新規ページ: 2（`/admin/newsletter`, `/[locale]/unsubscribe`）
- 新規コンポーネント: 4（バナー、送信フォーム、プレビュー、送信履歴詳細）
- 既存変更: トップページ、管理画面ダッシュボード
- 新規環境変数: 1（`NEWSLETTER_HMAC_SECRET`）

---

## 11. 技術的な決定事項

| 決定 | 理由 |
|------|------|
| Googleログイン必須で登録 | 既存認証基盤を活用。使い捨てメール防止 |
| 商品単位ではなく一斉送信 | 1点ものの大量輸入モデルに合致 |
| Resend Batch API（permissive モード） | 部分失敗時も送信可能なメールは送信。個別エラーを `errors` 配列で取得可能 |
| 配信停止は `NEWSLETTER_HMAC_SECRET` で署名 | `JWT_SECRET` と用途分離。30日有効期限でセキュリティ確保 |
| 配信停止は GET メソッド | メールリンクから直接アクセス。Cloudflare Workers での DELETE + body 問題を回避 |
| subscriber テーブルに email カラムなし | `ON DELETE CASCADE` + JOIN で常に最新メールを取得。冗長データを排除 |
| `db.batch()` で排他制御 | D1 は BEGIN/COMMIT 非対応。既存の order-queries.ts と同じパターン |
| `getAdminSession()` で認証 | NextAuth v5 ベース。旧JWT認証は 410 Gone 状態で使用しない |
| インラインHTMLメールテンプレート | 既存の `send-order-email.ts` と一貫性を保つ。react-email は導入しない |
| 送信履歴APIにページネーション | 本文（最大10,000文字×2言語）を含む全件取得を避ける |
| `sent_by` カラムで操作者追跡 | 管理者が複数名（ADMIN_EMAILS に4名登録）のため、誰が送信したか記録 |
| subscribe API を冪等に | フロント実装をシンプルに。既登録時は locale 更新のみ |
| 「直近7日間」はUTC基準 | products.created_at がUTCで保存されているため統一 |
| サイトからの解除機能なし | メールフッターで十分。UIの複雑化を避ける |

---

## 12. 将来の拡張（今回は実装しない）

- **メール開封率**: Resend の webhook で開封・クリック追跡
- **セグメント配信**: カテゴリ別（フィギュア好き、キーチェーン好き等）
- **スケジュール送信**: 指定日時に自動送信
- **A/Bテスト**: 件名・本文のバリエーションテスト
- **テンプレート保存**: よく使うメールテンプレートの保存・再利用
- **非同期キュー送信**: Cloudflare Queues で大量送信に対応（500人超で検討）
- **ダブルオプトイン**: 確認メール送信後に正式登録（スパム問題が出た場合）
- **react-email 移行**: メールテンプレートのコンポーネント化（テンプレート種類が増えた場合）

---

## 付録: レビュー指摘対応表

### Round 1（12件）

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | CRITICAL | 配信停止トークンに有効期限がない | HMACペイロードに `expires_timestamp` を含め、30日の有効期限を設定。§6-2 |
| 2 | CRITICAL | メール送信のエラーハンドリング・リトライ未定義 | `newsletter_sends` に `sent_count`, `failed_count`, `status` を追加。Resend permissive モードで個別エラー取得。§6-4 |
| 3 | CRITICAL | ユーザーのメールアドレス変更への対応 | subscriber テーブルから email カラムを削除。送信時は常に users を JOIN。§4-1 |
| 4 | HIGH | locale の更新手段がない | subscribe API が既登録時に locale を更新。§7 |
| 5 | HIGH | 自動登録にGDPR同意UIがない | 未ログインユーザーにはログイン後に確認ダイアログ表示。§2-1 |
| 6 | HIGH | 大量登録者時のスケーラビリティ | 段階的送信戦略。§6-3 |
| 7 | HIGH | 送信テスト手段がない | `testMode` パラメータ。§3-3, §5-2 |
| 8 | MEDIUM | active の複数レコード制御 | `db.batch()` で排他更新。§4-1 |
| 9 | MEDIUM | 配信停止ページの多言語対応 | `[locale]` ルートセグメントで決定。§6-2 |
| 10 | MEDIUM | 送信履歴の詳細表示UIがない | sends/[id] API追加。§5-2 |
| 11 | MEDIUM | 重複送信防止の具体的実装 | `newsletter_sends.sent_at` をDBクエリで確認。§5-2 |
| 12 | MEDIUM | subscribe の 409 を冪等 200 に | 既登録時は `200 { subscribed: true, alreadySubscribed: true }`。§5-1 |

### Round 2（13件）

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| C1 | CRITICAL | 署名鍵が JWT_SECRET と共用 | `NEWSLETTER_HMAC_SECRET` 環境変数を新設。§6-2, §9 |
| C2 | CRITICAL | Resend Batch API 仕様確認不足 | `batchValidation: 'permissive'` で `data`/`errors` を個別取得。集計ロジック明記。§6-4 |
| H1 | HIGH | D1のトランザクション非対応 | `db.batch()` を使用。既存パターンに準拠。§4-1 |
| H2 | HIGH | /[locale]/unsubscribe のルーティング不整合 | `[locale]` ディレクトリは存在する。next-intl ルーティングに準拠。§6-2 |
| H3 | HIGH | 管理者認証が2系統 | `getAdminSession()`（NextAuth v5）を明示。旧JWT認証は使用しない。§5-0 |
| H4 | HIGH | email カラムのフォールバックが不要 | email カラムを削除。JOIN のみで取得。§4-1 |
| M1 | MEDIUM | 送信履歴にページネーションがない | `?limit=20&offset=0` 追加。一覧に本文を含めない。§5-2 |
| M2 | MEDIUM | 入力バリデーション未定義 | 件名200文字、本文10,000文字、バナー500文字の上限。§5-0 |
| M3 | MEDIUM | 操作者の追跡ができない | `sent_by` カラム追加。§4-1 |
| M4 | MEDIUM | DELETE + body がCloudflareで問題 | 配信停止を GET メソッド + クエリパラメータに変更。§5-1 |
| M5 | MEDIUM | 直近7日間の基準タイムゾーン未定義 | UTC基準と明記。§3-3 |
| L1 | LOW | react-email と既存HTMLメールの混在 | インラインHTMLで統一（既存パターン踏襲）。§6-1 |
| L2 | LOW | テスト送信の頻度上限未定義 | 1分5回まで（Resend APIレート制限準拠）。§3-3 |
