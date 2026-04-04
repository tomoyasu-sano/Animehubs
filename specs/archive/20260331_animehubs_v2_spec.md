# 仕様書: AnimeHubs v2 — Stripe決済 + 実物確認ルート導入

作成日: 2026-03-31
更新日: 2026-04-02（仕様チェック指摘8件修正）
ステータス: **確定**（全決定事項合意済み・実装着手可）

---

## 1. 概要・変更方針

### 現行 vs v2 比較

| 項目 | 現行 (v1) | v2 |
|------|-----------|-----|
| 決済 | なし（予約のみ） | Stripe（全額決済） |
| 受け渡し | 対面のみ | 配送 + 対面（実物確認） |
| ユーザーアカウント | なし | あり（**ログイン必須**） |
| ログイン方法 | なし | **Googleアカウント**（NextAuth.js v5） |
| ゲスト閲覧 | 全ページ可 | 商品一覧・詳細のみ可。カート以降はログイン必須 |
| お気に入り | localStorage | DB（ログイン必須） |
| カート | localStorage | **localStorage を継続**（ログイン必須、デバイス間同期なし） |
| 在庫管理 | 予約時に減算 | 決済完了時に減算 |
| 自動キャンセル | なし | あり（実物確認 7日後） |
| 通貨 | — | **SEK**（将来EUR対応できる設計） |
| 配送エリア | — | **スウェーデン国内のみ**（将来EU対応できる設計） |

### コアバリュー

> 「実物確認」ルート = 購入前に現地で商品を確認できる、アニメグッズ販売の差別化機能。
> 冷やかし防止のため、Stripe事前決済必須。7日以内未確認は自動キャンセル＆返金。

---

## 2. 画面一覧・ユーザーフロー

### 2-1. 画面一覧

認証状態による画面アクセス制御:

| 状態 | アクセス可能な画面 |
|------|-----------------|
| 未ログイン | トップ、商品一覧、商品詳細 |
| ログイン済み | 全画面 |
| 管理者 | 全画面 + 管理画面 |

未ログインでカート・お気に入り・チェックアウトにアクセスした場合: ログインページへリダイレクト（元のURLをクエリパラメータで保持し、ログイン後に戻る）。

**カートボタン押下時のログイン誘導フロー:**
- 未ログイン状態で「カートに入れる」ボタンを押した場合 → `/auth/login?callbackUrl=元の商品詳細URL` へリダイレクト
- ログイン成功後 → 商品詳細ページへ戻る（カートには自動追加しない。ユーザーが再度ボタンを押す）
- カートデータは localStorage に保存するため、ログイン状態が切れた場合でもカート内容は端末に残る

| 画面 | パス | ログイン必須 | 説明 |
|------|------|------------|------|
| トップ | `/` | — | ヒーロー + 新着・おすすめ商品 |
| 商品一覧 | `/products` | — | 検索・フィルタ、いいねボタン、在庫表示 |
| 商品詳細 | `/products/[id]` | — | ギャラリー、カートイン、いいね |
| お気に入り | `/favorites` | ✓ | いいね一覧、カートへ移動 |
| カート | `/cart` | ✓ | アイテム確認、配送 or 実物確認 選択（**1注文につき1タイプのみ**。混在不可） |
| チェックアウト（配送） | `/checkout/delivery` | ✓ | 住所入力、Stripe決済 |
| チェックアウト（実物確認） | `/checkout/inspection` | ✓ | 説明確認、Stripe決済 |
| 注文完了 | `/checkout/complete?session_id={CHECKOUT_SESSION_ID}` | ✓ | 完了メッセージ、インスタDMリンク（実物確認時）。`session_id` から注文を取得。Webhookが未到着の場合は「処理中」表示でポーリング（最大30秒） |
| 注文履歴 | `/orders` | ✓ | 過去注文一覧 |
| 注文詳細 | `/orders/[id]` | ✓ | 注文詳細・ステータス確認 |
| マイページ | `/account` | ✓ | プロフィール（Googleから取得）、デフォルト住所 |
| ログイン | `/auth/login` | — | Googleログインボタン |
| 管理: ダッシュボード | `/admin` | 管理者 | 売上・注文サマリー |
| 管理: 商品管理 | `/admin/products` | 管理者 | 商品CRUD |
| 管理: 注文管理 | `/admin/orders` | 管理者 | 注文一覧・ステータス更新 |
| 管理: ユーザー管理 | `/admin/users` | 管理者 | ユーザー一覧（閲覧のみ） |

### 2-2. ユーザーフロー全体図

```
[商品一覧 / 商品詳細]  ← 未ログインでもここまで閲覧可
  ↓ カートに入れる or ♡いいね
  ↓ ※未ログインの場合 → [ログイン画面（Google）] → 元の操作に戻る
  ↓
[カート]（ログイン必須）
  ├─ 配送を選択 ──────────────────→ [チェックアウト/配送]
  │                                      ↓ 住所入力（スウェーデン国内）
  │                                      ↓ Stripe決済
  │                                   [注文完了]
  │
  └─ 実物確認を選択 ──────────────→ [チェックアウト/実物確認]
                                         ↓ 注意事項に同意
                                         ↓ Stripe全額事前決済
                                      [注文完了 + インスタDMボタン]
                                              ↓
                                         [7日以内に対面確認]
                                         納得 → 管理者「受取完了」→ 注文確定
                                         不満 → 管理者「返金」実行
                                         7日経過 → 自動キャンセル＆自動返金

[お気に入り一覧]（ログイン必須）
  └─ カートへ移動 ──→ [カート]
```

---

## 3. 実物確認ルート詳細

### 3-1. フロー仕様

1. カートで「実物確認（予約）」を選択
2. 注意事項に同意（キープ期間・自動キャンセル説明）
3. Stripeで全額事前決済
4. 注文完了画面に「InstagramのDMで日時を調整する」ボタン表示
5. Instagram DMで日時・場所を調整（サイト外）
6. 対面当日:
   - **納得した場合:** 管理者が管理画面で `completed` に更新 → 商品引き渡し
   - **キャンセルの場合:** 管理者が管理画面で返金実行 → `cancelled` + Stripe返金

### 3-2. ステータス遷移

```
[決済完了時]
    pending_inspection
         ↓ 対面後              ↓ 7日経過（Cron）
    completed  or  cancelled（管理者が現地でキャンセル）
              or  cancelled + 自動返金（Stripe）
```

> `confirmed` ステータスは使用しない。`pending_inspection` → `completed` または `cancelled` に直接遷移する。

### 3-3. 自動キャンセル実装方針

**Cloudflare Workers Cron Trigger** を使用した定期実行:

- 実行間隔: 毎時（`0 * * * *`）
- 処理内容:
  1. `type = 'inspection'` かつ `status = 'pending_inspection'` かつ `expires_at < NOW()` の注文を取得
  2. 各注文に対して Stripe 返金 API を呼び出し（`stripe.refunds.create`）
  3. 注文ステータスを `cancelled`、`cancelled_reason = 'expired'` に更新
  4. 顧客にキャンセル通知メール送信（Resend）

```typescript
// wrangler.toml に追加
[[triggers.crons]]
cron = "0 * * * *"
```

### 3-4. 注意事項テキスト（決済前に表示）

> 実物確認をご利用の場合、商品代金全額が事前に決済されます。
> 決済から7日以内に受け渡しが完了しない場合、自動的にキャンセル・全額返金となります。
> 安全のため、受け渡し場所は人目のある公共の場所（駅・ショッピングセンター内等）を指定します。

---

## 4. Stripe 決済仕様

### 4-1. 通貨・価格

- **現在の通貨:** SEK（スウェーデン・クローナ）のみ
- 価格保存: オーレ単位（1 SEK = 100 öre）
- Stripe手数料（約3%）: 販売価格に上乗せ済みとして扱う

**将来のEUR拡張に備えた設計:**
- 通貨設定は定数ファイル（`lib/constants.ts`）に集約し、コード中に `'SEK'` をハードコードしない
- Stripe の `currency` パラメータは定数から参照する
- `products.price` は常に最小通貨単位（öre/cent）で保存するため、通貨変更時もDB設計は変わらない

```typescript
// lib/constants.ts
export const CURRENCY = 'SEK' as const; // EUR切り替え時はここだけ変更
export const CURRENCY_SYMBOL = 'kr';
```

**将来の配送エリア拡張に備えた設計:**
- 配送先住所の country フィールドを必ず保持する
- 送料計算は `lib/shipping.ts` に集約し、現在は Sweden 固定ロジックを返す
- バリデーション（郵便番号形式等）も国ごとに切り替えられる構造にする

```typescript
// lib/shipping.ts
export function getShippingOptions(country: string) {
  // 現在はSEのみ対応。将来はEU各国を追加
  if (country === 'SE') return SWEDEN_SHIPPING_OPTIONS;
  throw new Error(`Shipping to ${country} is not yet supported`);
}
```

### 4-2. 決済フロー（配送）

```
1. チェックアウト時に /api/checkout/create-session を呼び出す
2. Stripe Checkout Session を作成（mode: 'payment'）
3. ユーザーを Stripe Checkout ページへリダイレクト
4. 決済完了 → Stripe Webhook (payment_intent.succeeded) を受信
5. Webhook で注文レコードを pending_payment → paid に更新
6. 完了ページへリダイレクト
```

### 4-3. 決済フロー（実物確認）

```
1. /api/checkout/create-session（inspection用）を呼び出す
2. Stripe Payment Intent を作成（capture_method: 'automatic'）
3. Stripe Checkout Session（mode: 'payment'）
4. 決済完了 → Webhook (payment_intent.succeeded)
5. 注文 status = 'pending_inspection'、expires_at = NOW + 7days
6. 完了ページ表示（インスタDMリンク付き）
```

> **`capture_method: 'automatic'` の意図的な選択について:**
> `manual`（確認後にキャプチャ）の方がStripe手数料的には有利だが、`manual` キャプチャのホールド期間はStripeの上限が7日間のため、v2の「7日間キープ」設計と正確に一致せず運用リスクがある。`automatic`（即時全額キャプチャ）+ 不満時に返金、という設計を意図的に選択している。

### 4-3b. 返金フロー（配送注文キャンセル）

対象: `type = 'delivery'` かつ `status = 'paid'`（未発送）の注文

```
1. ユーザーがマイページ「注文詳細」からキャンセルリクエスト送信
   → 注文 status = 'cancellation_requested'

2. 管理者が管理画面で確認・「承認」ボタンをクリック（1クリック）

3. システムが自動で以下を実行:
   a. stripe.refunds.create()  → 全額返金
   b. 各商品の在庫を +1 復元（トランザクション）
   c. 顧客にキャンセル完了メール送信（Resend）
   d. 注文 status = 'cancelled'、cancelled_reason = 'customer_request'

4. 管理者が「却下」した場合:
   - 注文 status = `paid` に戻す
   - 顧客にキャンセルリクエスト却下メール送信（Resend）
   - 注文詳細画面に「キャンセルリクエストは却下されました」と表示

5. 発送後（status = 'shipped' 以降）はキャンセルボタン非表示
   → 個別対応が必要な場合は管理者が手動で返金ボタンを使用
```

> スウェーデンの Distansavtalslagen（通販法）により14日間のクーリングオフ権あり。
> 利用規約に「発送後のキャンセルはお問い合わせください」と記載し、管理者が個別対応する。

### 4-4. 返金フロー（実物確認キャンセル）

```
管理者が管理画面で「返金」ボタン押下
→ /api/admin/orders/[id]/refund 呼び出し
→ stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
→ Webhook (charge.refunded) で注文 status = 'cancelled' に更新
→ 顧客へキャンセルメール送信
```

### 4-5. Stripe Webhook イベント一覧

| イベント | 処理 |
|---------|------|
| `payment_intent.succeeded` | 注文 status を `pending_payment → paid` に更新、在庫を確定減算 |
| `payment_intent.payment_failed` | 注文 status を `payment_failed` に更新、在庫の仮押さえを解除 |
| `checkout.session.expired` | 注文 status を `payment_failed` に更新、在庫の仮押さえを解除。Cron より即時処理できるためこちらを優先（Cron は補完として維持） |
| `charge.refunded` | 注文 status を `cancelled` に更新 |

### 4-6. 在庫の仮押さえ

- **チェックアウトSession作成時:** 在庫を仮押さえ（`reserved_stock + 1`）
- **決済完了時（Webhook）:** 仮押さえを確定在庫減算に変換（`stock - 1, reserved_stock - 1`）
- **決済失敗 / タイムアウト時:** 仮押さえを解除（`reserved_stock - 1`）
- **Stripe Checkout Session 有効期限:** Session 作成時に `expires_at = now + 30分` を明示設定（Stripe API の最短値。デフォルト 24 時間は長すぎるため必ず設定する）
- 仮押さえのタイムアウト: Cron Triggerで30分以上の未完了Sessionをクリーンアップ（Session有効期限に合わせて15分→30分に変更）

---

## 5. ユーザーアカウント設計

### 5-1. 方針（確定）

- **ログイン必須:** カート・お気に入り・購入はすべてログインが必要
- **ゲスト購入なし:** ブラウズ（商品一覧・詳細）のみ未ログインで可
- **ログイン方法:** **Googleアカウントのみ**（メール+パスワード登録なし）
- **認証ライブラリ:** **NextAuth.js v5**（**Drizzle Adapter** 経由で Cloudflare D1 に接続。公式 D1 アダプターは存在しないため Drizzle ORM の D1 ドライバーを介して使用する）
- **⚠️ PoC 必須**: Auth.js v5 + Drizzle Adapter + Cloudflare D1 の組み合わせが Cloudflare Workers Edge Runtime で動作することを **Phase 1 着手前に PoC で確認する**。動作しない場合の代替案は Lucia Auth または jose ベースのカスタム JWT 認証

### 5-2. NextAuth.js v5 設計

**Google OAuth scope:** `openid`, `email`, `profile`（NextAuth.js v5 のデフォルト scope で取得可能。追加 scope 不要）

```
認証フロー:
1. ユーザーが「Googleでログイン」ボタンをクリック
2. Googleの認証画面へリダイレクト
3. Google認証完了 → AnimeHubsにコールバック
4. NextAuth がユーザー情報（Google ID, 名前, メール, アバター画像）を受取る
5. users テーブルに初回ログイン時にレコードを自動作成（upsert）
6. HTTP-only Cookie にセッション情報を保存
7. 元のページ（カート等）にリダイレクト
```

- **セッション戦略:** `database`（Cloudflare D1にセッションを保存）
- **セッション有効期限:** 30日（ブラウザを閉じても維持）
- **管理者権限:** usersテーブルの `role` カラムで管理（`'user'` / `'admin'`）

### 5-3. 未ログイン時の画面制御

```typescript
// middleware.ts の保護対象パス
const protectedPaths = ['/cart', '/checkout', '/favorites', '/orders', '/account'];

// 未ログインでアクセス → /auth/login?callbackUrl=元のURL にリダイレクト
// ログイン成功後 → callbackUrl に自動遷移
```

### 5-4. ユーザー情報の取得元（Googleから自動取得）

| 項目 | 取得元 |
|------|--------|
| 表示名 | Google アカウント名 |
| メールアドレス | Google メール |
| アバター画像 | Google プロフィール画像 |
| パスワード | 不要（Google管理） |

→ サイト内でのプロフィール編集は「デフォルト配送先住所」のみ

---

## 6. DBスキーマ

### 6-1. products テーブル（既存 + 変更）

| カラム | 型 | 変更 | 説明 |
|--------|------|------|------|
| id | TEXT (UUID) | 既存 | 主キー |
| name_en | TEXT | 既存 | 商品名（英語） |
| name_sv | TEXT | 既存 | 商品名（スウェーデン語） |
| description_en | TEXT | 既存 | 説明（英語） |
| description_sv | TEXT | 既存 | 説明（スウェーデン語） |
| price | INTEGER | 既存 | 価格（SEK、オーレ単位） |
| stock | INTEGER | 既存 | 確定在庫数 |
| **reserved_stock** | INTEGER | **新規** | Stripe決済中の仮押さえ数（default: 0） |
| category | TEXT | 既存 | カテゴリ |
| condition | TEXT | 既存 | コンディション |
| images | TEXT | 既存 | 画像パスJSON配列 |
| featured | INTEGER | 既存 | トップページ表示フラグ |
| **likes_count** | INTEGER | **新規** | いいね数キャッシュ（default: 0）。`favorites` テーブルへの INSERT/DELETE と同一トランザクションでインクリメント/デクリメントする |
| created_at | TEXT | 既存 | 作成日時 |
| updated_at | TEXT | 既存 | 更新日時 |

### 6-2. users テーブル（新規）

| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| email | TEXT UNIQUE | Googleメールアドレス |
| name | TEXT | Google表示名 |
| image | TEXT NULL | Googleプロフィール画像URL |
| role | TEXT | `'user'` / `'admin'`（default: `'user'`） |
| default_address | TEXT NULL | デフォルト配送先住所JSON（`SwedishAddress` 型、セクション6-5b参照） |
| created_at | TEXT | 作成日時 |
| updated_at | TEXT | 更新日時 |

> `google_id` カラムは **削除**。Google アカウントIDは NextAuth.js v5 が管理する `accounts` テーブル（`provider_account_id`）に保存されるため重複不要。必要な場合は `accounts` テーブルと JOIN して取得する。

### 6-3. sessions テーブル（新規・NextAuth管理）

NextAuth.js v5 が自動管理するテーブル。手動操作不要。

| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT | セッションID |
| user_id | TEXT | users.id FK |
| expires | TEXT | 有効期限（30日） |

### 6-3b. accounts テーブル（新規・NextAuth管理）

NextAuth.js v5 が自動管理（OAuth プロバイダー情報）。手動操作不要。

| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT | 主キー |
| user_id | TEXT | users.id FK |
| provider | TEXT | `'google'` |
| provider_account_id | TEXT | Google アカウントID |
| ... | | NextAuth標準フィールド群（`access_token`, `token_type`, `scope`, `id_token` 等） |

> **Drizzle Adapterとスキーマ定義について:**
> NextAuth.js v5 の Drizzle Adapter を使用する場合、`sessions`・`accounts`・`verification_tokens` テーブルのスキーマを `src/lib/db/schema.ts` に手動で定義する必要がある（Adapter が参照するため）。NextAuth 公式ドキュメントのDrizzle Adapter用スキーマをそのまま使用すること。

### 6-4. favorites テーブル（新規）

| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| user_id | TEXT | users.id FK |
| product_id | TEXT | products.id FK |
| created_at | TEXT | 作成日時 |

UNIQUE制約: `(user_id, product_id)`

### 6-5. orders テーブル（旧reservationsを全面刷新）

| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| order_number | TEXT UNIQUE | 表示用注文番号（例: AH-20260331-0001） |
| order_date | TEXT | 注文日（YYYY-MM-DD、採番用） |
| order_seq | INTEGER | 日次連番（採番用。`MAX(order_seq) WHERE order_date = today` + 1 をトランザクションで取得。重複時は最大3回リトライ） |
| user_id | TEXT NOT NULL | users.id FK（ゲスト購入なしのため必須） |
| customer_name | TEXT | 顧客名 |
| customer_email | TEXT | 顧客メールアドレス |
| type | TEXT | `delivery` / `inspection` |
| status | TEXT | 下記ステータス参照 |
| stripe_payment_intent_id | TEXT | Stripe PaymentIntent ID |
| stripe_checkout_session_id | TEXT | Stripe Checkout Session ID |
| total_amount | INTEGER | 合計金額（オーレ単位） |
| items | TEXT | 注文商品JSON（スナップショット、下記スキーマ参照） |
| shipping_address | TEXT NULL | 配送先住所JSON（deliveryのみ、下記スキーマ参照） |
| expires_at | TEXT NULL | 実物確認の期限（inspectionのみ） |
| cancelled_reason | TEXT NULL | `expired` / `customer_request` / `seller_decision` |
| notes | TEXT NULL | 備考 |
| created_at | TEXT | 作成日時 |
| updated_at | TEXT | 更新日時 |

### 6-5b. JSON スキーマ定義

**`orders.items`（注文時点の商品スナップショット）:**

```typescript
type OrderItem = {
  product_id: string   // products.id
  name_en: string      // 注文時点の商品名（英語）
  name_sv: string      // 注文時点の商品名（スウェーデン語）
  price: number        // 注文時点の価格（öre単位）
  quantity: number     // 数量
  image: string        // 表示用メイン画像パス
}
// orders.items は OrderItem[] を JSON.stringify したもの
```

**`orders.shipping_address` / `users.default_address`（配送先住所）:**

```typescript
type SwedishAddress = {
  full_name: string    // 受取人氏名
  street: string       // 番地・通り名（例: "Kungsgatan 12"）
  city: string         // 市名（例: "Uppsala"）
  postal_code: string  // 郵便番号（例: "753 10"）。形式: /^\d{3}\s\d{2}$/
  country: 'SE'        // v2 はスウェーデン国内固定
}
```

### 6-6. orders ステータス定義

| ステータス | 説明 | 遷移先 |
|-----------|------|--------|
| `pending_payment` | 決済セッション作成済・未完了 | `paid`, `payment_failed` |
| `paid` | 決済完了（配送・未発送） | `shipped`, `cancellation_requested` |
| `cancellation_requested` | ユーザーがキャンセル申請（管理者承認待ち） | `cancelled`（承認）, `paid`（却下） |
| `pending_inspection` | 実物確認・期限内 | `completed`, `cancelled` |
| `shipped` | 発送済み | `completed`（管理者が手動で更新。運用フローはセクション6-6bを参照） |
| `completed` | 完了 | （最終） |
| `payment_failed` | 決済失敗 | （最終） |
| `cancelled` | キャンセル・返金済み | （最終） |

### 6-6b. shipped → completed の運用フロー

v2 では配送追跡APIとの自動連携は行わない。以下の運用ルールで管理者が手動更新する:

1. 管理者が商品を発送し、追跡番号を取得
2. 管理画面で status を `paid → shipped` に更新（追跡番号を notes に記入）
3. 顧客に発送通知メールが自動送信される
4. **配達完了の確認方法（いずれかを選択）:**
   - 追跡番号で配送業者サイトを確認 → 管理者が `shipped → completed` に手動更新
   - 発送から14日経過しても未完了の場合 → 管理者が判断して完了処理 or 再確認

> v2 では「顧客が受取完了ボタンを押す」機能は実装しない（複雑化を避けるため）。
> 将来的に配送業者API連携が必要になった場合は追加検討する。

### 6-7. admin_users テーブル（廃止）

v2 では廃止。管理者権限は `users.role = 'admin'` で管理する。

初期シードデータ（Googleログイン後に自動で `role = 'admin'` を付与するメールアドレスリスト）:

```typescript
// lib/constants.ts
export const ADMIN_EMAILS = [
  'anytimes.sano@gmail.com',
  'asa5ng13@gmail.com',
] as const;
```

これらのメールアドレスで初回Googleログイン時、`users.role` を自動的に `'admin'` に設定する。

---

## 7. API 設計

### 7-1. 公開 API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/products` | 商品一覧（検索・フィルタ・ページネーション） |
| GET | `/api/products/[id]` | 商品詳細 |
| POST | `/api/favorites` | いいね追加（要認証） |
| DELETE | `/api/favorites/[productId]` | いいね削除（要認証） |
| GET | `/api/favorites` | いいね一覧（要認証） |
| POST | `/api/checkout/create-session` | Stripe Checkout Session作成 |
| GET | `/api/orders/[id]` | 注文詳細（本人のみ） |
| GET | `/api/orders` | 注文履歴（要認証） |
| POST | `/api/orders/[id]/cancel` | キャンセルリクエスト送信（要認証・本人のみ `order.user_id === session.user.id`・`paid` ステータスのみ） |

### 7-2. 認証 API

NextAuth.js v5 が `/api/auth/[...nextauth]` で自動管理するため、独自の register/login エンドポイントは不要。

| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth.js v5 が自動処理（Google OAuth フロー一式） |

> `register`・`login`・`/api/auth/me` の独自エンドポイントは作成しない。
> セッション取得は NextAuth.js v5 の `auth()`（Server Component・API Route）または `useSession()`（Client Component）で行う。独自エンドポイントは不要。

### 7-3. Webhook API

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/webhooks/stripe` | Stripe Webhookエンドポイント |

> **必須セキュリティ要件**: Webhook ハンドラは `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` による署名検証を必ず実施すること。検証失敗時は HTTP 400 を返し処理を中断する。

### 7-4. 管理 API

**認可チェック方針**: middleware で `/admin/*` パスを `role = 'admin'` チェックでブロック + 各 Admin API ハンドラ内でも `session.user.role === 'admin'` を再確認（二重チェック）。

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/admin/orders` | 注文一覧 |
| GET | `/api/admin/orders/[id]` | 注文詳細 |
| PATCH | `/api/admin/orders/[id]/status` | ステータス更新 |
| POST | `/api/admin/orders/[id]/refund` | 返金実行 |
| GET | `/api/admin/products` | 商品一覧（管理用） |
| POST | `/api/admin/products` | 商品作成 |
| PUT | `/api/admin/products/[id]` | 商品更新 |
| DELETE | `/api/admin/products/[id]` | 商品削除 |

### 7-5. レート制限方針

既存の `src/lib/rate-limit.ts` を継続使用。Cloudflare Workers の KV または in-memory カウンターで実装。

| エンドポイント | 制限 | 単位 |
|--------------|------|------|
| `POST /api/checkout/create-session` | 同一ユーザー 5回まで | 1分 |
| `POST /api/auth/[...nextauth]` | 同一IP 20回まで | 1分 |
| `POST /api/favorites` | 同一ユーザー 30回まで | 1分 |
| `POST /api/orders/[id]/cancel` | 同一ユーザー 3回まで | 1分 |

制限超過時は HTTP 429 + `Retry-After` ヘッダーを返す。

### 7-6. Cron Worker API（内部）

| 処理 | トリガー | 説明 |
|------|---------|------|
| auto-cancel-expired-inspections | `0 * * * *`（毎時） | 期限切れ実物確認を自動キャンセル＆返金 |
| cleanup-stale-checkout-sessions | `*/30 * * * *`（30分ごと） | 未完了Checkout Sessionの仮押さえ解除（Session有効期限30分に合わせて変更） |

**wrangler.toml 設定例:**
```toml
[[triggers.crons]]
crons = [
  "0 * * * *",      # auto-cancel-expired-inspections
  "*/30 * * * *"    # cleanup-stale-checkout-sessions
]
```

Worker の `scheduled` ハンドラで `event.cron` を見て処理を振り分ける。

---

## 8. コンポーネント構成

```
src/
  app/
    [locale]/
      layout.tsx
      page.tsx                    # トップページ
      products/
        page.tsx                  # 商品一覧
        [id]/page.tsx             # 商品詳細
      favorites/page.tsx          # お気に入り一覧
      cart/page.tsx               # カート
      checkout/
        delivery/page.tsx         # 配送チェックアウト
        inspection/page.tsx       # 実物確認チェックアウト
        complete/page.tsx         # 完了ページ
      orders/
        page.tsx                  # 注文履歴
        [id]/page.tsx             # 注文詳細
      account/page.tsx            # マイページ
      auth/
        login/page.tsx            # Googleログインボタンのみ（register 画面は不要）
    admin/                        # locale prefix なし（/admin/*）、表示言語は英語固定
      page.tsx                    # ダッシュボード
      orders/page.tsx             # 注文管理
      orders/[id]/page.tsx        # 注文詳細・返金
      products/page.tsx           # 商品管理
      products/new/page.tsx
      products/[id]/edit/page.tsx
  components/
    products/
      ProductCard.tsx             # いいねボタン統合
      ProductGrid.tsx
      ProductGallery.tsx
      FavoriteButton.tsx          # ハートアイコン（既存FavoriteButtonから移動）
    cart/
      CartSidebar.tsx
      CartItem.tsx
      OrderTypeSelector.tsx       # 配送 or 実物確認 選択UI（新規）
    checkout/
      DeliveryForm.tsx            # 住所入力フォーム（新規）
      InspectionConfirmation.tsx  # 実物確認説明・同意UI（新規）
      StripeCheckout.tsx          # Stripe組み込みUI（新規）
    orders/
      OrderStatusBadge.tsx        # ステータスバッジ（新規）
      OrderCard.tsx               # 注文カード（新規）
    admin/
      RefundButton.tsx            # 返金ボタン（確認ダイアログ付き）（新規）
```

---

## 9. 多言語対応（継続）

next-intl を継続使用。以下のキーを追加:

```json
// messages/en.json（追加分）
{
  "orderType": {
    "delivery": "Standard Delivery",
    "inspection": "In-Person Inspection (Reserve & Hold)"
  },
  "inspection": {
    "description": "Pay now to reserve the item. Meet in person within 7 days to inspect. Full refund if cancelled.",
    "expireWarning": "This reservation will expire in {days} days.",
    "instagramCTA": "Schedule a meeting on Instagram DM",
    "autoCancel": "Reservations not completed within 7 days are automatically cancelled and refunded."
  },
  "orderStatus": {
    "pending_payment": "Awaiting Payment",
    "paid": "Paid",
    "cancellation_requested": "Cancellation Requested",
    "pending_inspection": "Reserved - Awaiting Inspection",
    "shipped": "Shipped",
    "completed": "Completed",
    "payment_failed": "Payment Failed",
    "cancelled": "Cancelled"
  }
}
```

---

## 10. 実装フェーズ計画

> 詳細な実装手順書（ステップ別確認項目・人間確認ポイント）は別ファイルを参照:
> **[`20260402_implementation_guide.md`](./20260402_implementation_guide.md)**

### Phase 1: 基盤整備（既存コードの整理 + 認証）

- 目標: ユーザー認証基盤、DBスキーマ更新
- 内容:
  1. 既存認証コード削除（`src/lib/auth.ts`、`bcryptjs`、`jsonwebtoken` 依存を除去）
  2. DBスキーマ更新（users, sessions, accounts, favorites, ordersテーブル追加、productsテーブル更新）
  3. 既存 reservations テーブルのデータ移行
  4. NextAuth.js v5 のセットアップ（Drizzle Adapter + Cloudflare D1）
  5. ログイン・ログアウト画面（Googleログインのみ）
  6. ミドルウェア更新（認証ルート保護）

### Phase 2: お気に入り + 商品一覧改修

- 目標: いいね機能の DB 永続化
- 内容:
  1. FavoriteButton コンポーネント改修（localStorage→API切り替え）
  2. お気に入りAPI実装
  3. 商品一覧の在庫ステータス表示
  4. お気に入り一覧ページ改修（「カートへ移動」ボタン追加）

### Phase 3: Stripe 決済統合

- 目標: 全額Stripe決済の実現
- 内容:
  1. Stripe ライブラリ導入・環境変数設定
  2. Checkout Session 作成 API
  3. 配送チェックアウトフロー（住所入力 + Stripe）
  4. Stripe Webhook 実装
  5. 注文完了ページ
  6. 在庫仮押さえ・確定ロジック

### Phase 4: 実物確認ルート

- 目標: 実物確認フローの完全実装
- 内容:
  1. カート画面に注文タイプ選択UI追加
  2. 実物確認チェックアウト画面
  3. expires_at の設定ロジック
  4. Cron Triggerによる自動キャンセル実装
  5. 管理画面: 実物確認注文の完了・返金操作
  6. 実物確認専用の完了メール（Instagram DMリンク付き）

### Phase 5: 注文履歴 + マイページ

- 目標: ログインユーザー向け付加価値機能
- 内容:
  1. 注文履歴一覧・詳細ページ
  2. マイページ（プロフィール編集、デフォルト住所）
  3. 実物確認の期限カウントダウン表示

### Phase 6: 管理画面強化 + 仕上げ

- 目標: 運用効率化・品質向上
- 内容:
  1. 管理ダッシュボードのStripe売上連携
  2. 注文管理画面の実物確認フロー対応
  3. SEO対応（メタタグ・OGP・サイトマップ更新）
  4. パフォーマンス最適化
  5. E2Eテスト整備

---

## 10b. メール通知一覧

Resend + react-email を使用。送信失敗はノンブロッキングで処理し、ステータス更新は続行する。

**顧客向け:**

| # | メール種別 | 送信トリガー | 受信者 |
|---|-----------|------------|--------|
| 1 | 注文確認（配送） | `payment_intent.succeeded`（type: delivery） | 顧客 |
| 2 | 注文確認（実物確認） | `payment_intent.succeeded`（type: inspection） | 顧客 |
| 3 | 発送通知 | 管理者が status を `shipped` に更新 | 顧客 |
| 4 | キャンセルリクエスト却下通知 | 管理者がキャンセルリクエストを却下 | 顧客 |
| 5 | キャンセル・返金完了通知 | status が `cancelled` に更新（いずれの経路も） | 顧客 |
| 6 | 自動キャンセル通知 | Cron による期限切れキャンセル実行時 | 顧客 |

**管理者向け（送信先: `ADMIN_EMAILS` に定義した2アカウント）:**

| # | メール種別 | 送信トリガー | 受信者 |
|---|-----------|------------|--------|
| 7 | 新規注文通知 | `payment_intent.succeeded`（注文確定時） | 管理者 |
| 8 | キャンセルリクエスト通知 | ユーザーがキャンセルリクエストを送信 | 管理者 |
| 9 | 自動返金失敗アラート | Cron による自動返金で Stripe API エラーが発生した場合 | 管理者 |

---

## 11. テスト戦略

### 単体テスト（Vitest）

- Stripe Webhook ハンドラ（各イベントの処理検証）
- 自動キャンセルロジック（期限判定、返金フロー）
- 在庫仮押さえ・確定・解除のトランザクション
- 認証ヘルパー（セッション検証）

### 結合テスト

- チェックアウトAPI（Session作成、在庫確認）
- 返金API（管理者権限チェック、Stripe呼び出し）
- Favorites CRUD

### E2Eテスト（Playwright）

- 通常購入フロー: 商品選択 → カート → 配送決済 → 完了
- 実物確認フロー: 選択 → 事前決済 → 管理者完了処理
- 自動キャンセル: 期限切れ後のステータス確認
- お気に入り: 追加 → 一覧確認 → カートへ移動

---

## 12. リスクと対策

| リスク | 対策 |
|--------|------|
| Stripe Webhook の二重処理 | Webhook ハンドラは処理前に `stripe_checkout_session_id` で既存注文を検索し、すでに `paid` 以上のステータスであれば 200 を返して処理をスキップする。在庫二重減算を防ぐ |
| 自動返金失敗（Stripe APIエラー） | リトライキュー（Cron再実行）+管理者アラートメール |
| 在庫の同時購入競合 | D1のトランザクションで仮押さえをアトミックに処理 |
| 移行データ（reservations）の user_id | 移行スクリプトで特殊ユーザー（`system-migration@animehubs.se`）に紐付け、または NULL を避けるために仮ユーザーを作成する |
| Stripeテスト→本番切り替えミス | 環境変数を `STRIPE_SECRET_KEY`（本番）/ `STRIPE_TEST_SECRET_KEY` で厳格に分離 |
| Cloudflare Workers の実行時間制限（30秒） | 重い処理（一括返金等）はキューイングで分散 |
| メール送信失敗（Resend APIエラー） | メール送信失敗でも注文ステータス更新は続行する（非ブロッキング）。送信失敗はログに記録し、管理者アラートメールを試みる（1回のみリトライ） |

---

## 13. 環境変数（追加・変更）

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Instagram
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/animehubs_swe/

# Resend（既存）
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@animehubs.se

# 認証（NextAuth.js v5）
AUTH_SECRET=（ランダム文字列32文字以上）
AUTH_GOOGLE_ID=（Google Cloud Console の OAuth Client ID）
AUTH_GOOGLE_SECRET=（Google Cloud Console の OAuth Client Secret）
```

---

## 14. 決定事項まとめ と 残り未決定事項

### ✅ 確定済み

| 項目 | 決定内容 |
|------|---------|
| 認証方法 | **Googleアカウントログインのみ**（NextAuth.js v5） |
| ゲスト購入 | **なし**（カート以降はログイン必須） |
| 通貨 | **SEKのみ**（将来EUR拡張できる設計） |
| 配送エリア | **スウェーデン国内のみ**（将来EU拡張できる設計） |
| 決済 | **Stripe**（クレジットカード / Apple Pay） |
| 自動キャンセル | **実物確認7日後**（Cloudflare Cron Trigger） |

### ✅ 追加確定（2026-04-01）

| 項目 | 決定内容 |
|------|---------|
| 送料 | **799 SEK以上で無料 / 未満は79 SEK**（定数化、変更可能） |
| 送料無料ライン | `FREE_SHIPPING_THRESHOLD_ORE = 79900`（öre単位） |
| 送料金額 | `SHIPPING_FEE_ORE = 7900`（öre単位） |
| 管理者アカウント | `anytimes.sano@gmail.com` / `asa5ng13@gmail.com` |
| Stripeアカウント | 開設済み（Webhook設定・APIキー取得が必要） |
| Google Cloud Console | プロジェクトID `523153073330` 既存（OAuth Client ID/Secret を発行すればOK） |

送料定数はすべて `lib/constants.ts` に集約:

```typescript
// lib/constants.ts
export const FREE_SHIPPING_THRESHOLD_ORE = 79900; // 799 SEK
export const SHIPPING_FEE_ORE = 7900;             // 79 SEK
```

### ✅ 追加確定（2026-04-01 その2）

| 項目 | 決定内容 |
|------|---------|
| Instagram URL | `https://www.instagram.com/animehubs_swe/` |
| 実物確認の受け渡し場所 | **Uppsala Central Station のみ**（定数化、将来追加可能） |
| 注文番号の形式 | `AH-YYYYMMDD-NNNN`（例: `AH-20260401-0001`）。NNNN は `MAX(order_seq) + 1` をトランザクション内で採番。`order_number` に UNIQUE 制約を付与し、重複発生時は最大3回リトライする |
| 配送注文の返金ポリシー | **発送前のみキャンセル可・全額返金**（発送後は管理者裁量） |

受け渡し場所は `lib/constants.ts` に配列で管理し、追加は1行で対応できる設計。**v2 では Uppsala Central Station のみ。** 既存コードの `'central-station'` / `'stora-torget'` / `'forumgallerian'` は削除する:

```typescript
// lib/constants.ts
export const PICKUP_LOCATIONS = [
  { id: 'central-station', name_en: 'Uppsala Central Station', name_sv: 'Uppsala Centralstation' },
  // 将来追加する場合はここに追記するだけ
] as const;
```

---

## 15. 移行計画（既存データ）

### reservations → orders テーブル移行スクリプト

```sql
-- Step 1: 移行用システムユーザーを作成
INSERT INTO users (id, email, name, role, created_at, updated_at)
VALUES (
  'system-migration-user',
  'migration@animehubs.se',
  'Migration User',
  'user',
  datetime('now'),
  datetime('now')
) ON CONFLICT DO NOTHING;

-- Step 2: reservations → orders 移行（user_id はシステムユーザーに紐付け）
INSERT INTO orders (
  id, order_number, user_id, customer_name, customer_email,
  type, status, total_amount, items, created_at, updated_at
)
SELECT
  id,
  'AH-MIGRATED-' || substr(id, 1, 8) AS order_number,
  'system-migration-user' AS user_id,
  customer_name, customer_email,
  'inspection' AS type,
  CASE status
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'completed'  -- 移行時は既存を完了扱い
  END AS status,
  total_amount, items, created_at, updated_at
FROM reservations;
```

移行後、`reservations` テーブルを `reservations_archive` にリネームして保持。
