# 実装手順書: AnimeHubs v2

作成日: 2026-04-02
対応仕様書: `20260331_animehubs_v2_spec.md`

## 進め方のルール

1. **1ステップずつ進める** — 次のステップは前のステップの確認が完了してから着手
2. **各ステップの完了条件** — 確認項目をすべてパスしてから「完了」とする
3. **ロールバック基準** — 確認項目が1つでも失敗したら、そのステップ内で修正してから再確認
4. **コミットタイミング** — 各ステップ完了・確認後にコミット（フェーズ完了まで push しない）

---

## フェーズ構成

| フェーズ | 内容 | ステップ数 |
|---------|------|-----------|
| Phase 1 | DBスキーマ更新 + Google認証 | 4ステップ |
| Phase 2 | お気に入り機能 | 4ステップ |
| Phase 3 | Stripe決済（配送） | 6ステップ |
| Phase 4 | 実物確認ルート | 4ステップ |
| Phase 5 | 注文履歴・マイページ・キャンセル申請 | 4ステップ |
| Phase 6 | 管理画面強化・メール・仕上げ | 5ステップ |

---

## Phase 1: DBスキーマ更新 + Google認証

### Step 1-1: DBスキーマ更新とマイグレーション

**実装内容:**

- `src/lib/db/schema.ts` を更新
  - `products` テーブルに `reserved_stock`（INTEGER, default 0）、`likes_count`（INTEGER, default 0）を追加
  - `users` テーブルを新規追加（`id`, `email`, `name`, `image`, `role`, `default_address`, `created_at`, `updated_at`）
  - `accounts` テーブルを新規追加（NextAuth Drizzle Adapter 標準スキーマ）
  - `sessions` テーブルを新規追加（NextAuth Drizzle Adapter 標準スキーマ）
  - `verification_tokens` テーブルを新規追加（NextAuth Drizzle Adapter 標準スキーマ）
  - `favorites` テーブルを新規追加（`id`, `user_id`, `product_id`, `created_at`）
  - `orders` テーブルを新規追加（仕様書セクション6-5参照）
  - 既存の `reservations` テーブルはこのステップでは触らない
- Drizzle マイグレーション生成・実行

**確認項目:**
- [ ] `npx drizzle-kit generate` でエラーなし
- [ ] `wrangler d1 execute animehubs-db --local --file=<migration>` でエラーなし
- [ ] D1 ローカルDBに全テーブルが作成されていること（`wrangler d1 execute animehubs-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"` で確認）
- [ ] `npm run build` が通ること（型エラーなし）

**人間確認:** ターミナルでテーブル一覧を確認して OK を伝えてください

---

### Step 1-2: NextAuth.js v5 セットアップ（PoC）

**事前準備（人間が行う作業）:**

Google Cloud Console（プロジェクト `523153073330`）で以下を実行:
1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリケーションの種類: ウェブアプリケーション
3. 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
4. 作成後、Client ID と Client Secret を `.env.local` に設定:
   ```
   AUTH_SECRET=（`openssl rand -base64 32` で生成）
   AUTH_GOOGLE_ID=（取得したClient ID）
   AUTH_GOOGLE_SECRET=（取得したClient Secret）
   ```

**実装内容:**

- `next-auth@beta` と `@auth/drizzle-adapter` をインストール
- `src/lib/auth.ts` を新規作成（NextAuth.js v5 + Google Provider + Drizzle Adapter）
- `src/app/api/auth/[...nextauth]/route.ts` を作成
- `src/lib/constants.ts` に `ADMIN_EMAILS` を追加
- NextAuth の `signIn` コールバックで管理者メールなら `role: 'admin'` を設定

**確認項目:**
- [ ] `npm run dev` でサーバーが起動すること
- [ ] `http://localhost:3000/api/auth/signin` にアクセスして Google ボタンが表示されること
- [ ] Googleアカウント（`anytimes.sano@gmail.com`）でログインが完了すること
- [ ] D1 ローカルの `users` テーブルにレコードが1件作成されること
- [ ] `users.role` が `'admin'` になっていること
- [ ] 一般Googleアカウントでログインすると `users.role` が `'user'` になること

**人間確認:** ログイン動作を確認して OK を伝えてください

---

### Step 1-3: ミドルウェア更新（ルート保護）

**実装内容:**

- `src/middleware.ts` を更新
  - 既存の管理者認証ミドルウェアを NextAuth.js v5 ベースに置き換え
  - `protectedPaths = ['/cart', '/checkout', '/favorites', '/orders', '/account']`
  - 未ログインでこれらのパスにアクセスした場合 → `/auth/login?callbackUrl=元のURL` へリダイレクト
  - `/admin/*` パスは `role === 'admin'` でなければ 403 or `/auth/login` へリダイレクト
- `/auth/login` ページを作成（Googleログインボタンのみ）

**確認項目:**
- [ ] 未ログイン状態で `http://localhost:3000/cart` にアクセスすると `/auth/login?callbackUrl=/cart` にリダイレクトされること
- [ ] ログイン後に `/cart` に戻れること
- [ ] 未ログイン状態で `/admin` にアクセスするとリダイレクトされること
- [ ] 一般ユーザーで `/admin` にアクセスすると 403 or リダイレクトされること
- [ ] 管理者アカウントで `/admin` にアクセスできること
- [ ] 既存の商品一覧・詳細ページが未ログインでも閲覧できること

**人間確認:** 上記アクセス制御を実際に操作して確認してから OK を伝えてください

---

### Step 1-4: 既存データ移行（reservations → orders）

**実装内容:**

- 移行スクリプト `src/lib/db/migrate-reservations.ts` を作成
  - 移行用システムユーザー（`migration@animehubs.se`）を `users` テーブルに作成
  - `reservations` テーブルのデータを `orders` テーブルにコピー
  - `type = 'inspection'`、ステータスマッピング（`completed → completed`、`cancelled → cancelled`、その他 → `completed`）
  - `reservations` テーブルを `reservations_archive` にリネーム
- スクリプトを1回実行

**確認項目:**
- [ ] 移行スクリプトがエラーなく完了すること
- [ ] `orders` テーブルに既存データ件数分のレコードが存在すること
- [ ] `reservations_archive` テーブルにデータが残っていること
- [ ] `reservations` テーブルが存在しないこと（または空であること）
- [ ] `npm run build` が通ること

**人間確認:** 移行件数を確認して OK を伝えてください

**Phase 1 完了後にコミット:** `feat: Phase 1 - NextAuth v5 Google認証 + DBスキーマ更新`

---

## Phase 2: お気に入り機能

### Step 2-1: Favorites API 実装

**実装内容:**

- `POST /api/favorites` — いいね追加
  - 認証チェック（未ログインは 401）
  - `favorites` テーブルに INSERT
  - `products.likes_count` を +1（同一トランザクション）
  - 重複の場合は 409 を返す
- `DELETE /api/favorites/[productId]` — いいね削除
  - 認証チェック・本人チェック
  - `favorites` テーブルから DELETE
  - `products.likes_count` を -1（同一トランザクション）
- `GET /api/favorites` — いいね一覧取得
  - 認証チェック
  - `user_id` でフィルタし、商品情報を JOIN して返す

**確認項目:**
- [ ] curl / API クライアントでいいね追加・削除・一覧取得が動作すること
- [ ] 未ログインで叩くと 401 が返ること
- [ ] 同じ商品に2回いいねすると 409 が返ること
- [ ] `products.likes_count` がトランザクション内で正確に更新されること

**人間確認:** API動作を確認して OK を伝えてください

---

### Step 2-2: FavoriteButton コンポーネント改修

**実装内容:**

- 既存 `FavoriteButton.tsx` を改修
  - localStorage → API 呼び出しに切り替え
  - 未ログイン時: クリックすると `/auth/login?callbackUrl=現在のURL` へリダイレクト
  - ログイン済み: API を叩いていいねをトグル、楽観的更新でUIを即時反映
  - いいね数（`likes_count`）を表示
- `ProductCard.tsx` に FavoriteButton を統合

**確認項目:**
- [ ] 未ログインでハートボタンを押すとログイン画面に遷移すること
- [ ] ログイン後にハートボタンを押すと即時UI反映されること
- [ ] ページリロード後もいいね状態が保持されること
- [ ] いいね数が正しく表示されること

**人間確認:** ブラウザで操作して確認してから OK を伝えてください

---

### Step 2-3: お気に入り一覧ページ改修

**実装内容:**

- `/favorites` ページを改修
  - localStorage → API から取得に切り替え
  - 「カートへ移動」ボタン: 商品を localStorage（カート）に追加してカートページへ遷移
  - いいね解除ボタン
  - 在庫切れの商品は「在庫切れ」バッジを表示し、カートボタンを無効化

**確認項目:**
- [ ] いいねした商品が一覧表示されること
- [ ] 「カートへ移動」でカートに商品が追加されること
- [ ] いいね解除が動作すること
- [ ] 在庫切れ商品のカートボタンが無効になっていること

**人間確認:** ブラウザで操作して確認してから OK を伝えてください

---

### Step 2-4: 商品一覧の在庫ステータス表示

**実装内容:**

- `ProductCard.tsx` に在庫ステータスバッジを追加
  - `stock - reserved_stock > 0` → 在庫あり（表示なし or "In Stock"）
  - `stock - reserved_stock === 0` → 在庫切れ（"Out of Stock" バッジ）
  - `stock - reserved_stock <= 3` → 残りわずか（"Only N left" バッジ）
- カートに入れるボタンも在庫切れ時は無効化

**確認項目:**
- [ ] 在庫数に応じてバッジが正しく表示されること
- [ ] 在庫切れ商品のカートボタンが無効になっていること

**人間確認:** ブラウザで確認してから OK を伝えてください

**Phase 2 完了後にコミット:** `feat: Phase 2 - お気に入り機能（DB永続化）`

---

## Phase 3: Stripe決済（配送）

### Step 3-1: Stripe セットアップ

**事前準備（人間が行う作業）:**

1. Stripe ダッシュボードで APIキーを確認（テスト用を使用）:
   - Secret key: `sk_test_...`
   - Publishable key: `pk_test_...`
2. `.env.local` に追加:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=（Step 3-4で設定）
   ```

**実装内容:**

- `stripe` パッケージをインストール
- `@stripe/stripe-js` をインストール
- `src/lib/stripe.ts` を作成（Stripe インスタンス初期化）
- `lib/constants.ts` に送料定数を追加:
  ```typescript
  export const CURRENCY = 'SEK' as const;
  export const FREE_SHIPPING_THRESHOLD_ORE = 79900; // 799 SEK
  export const SHIPPING_FEE_ORE = 7900;             // 79 SEK
  ```

**確認項目:**
- [ ] `import Stripe from 'stripe'` でエラーなし
- [ ] `npm run build` が通ること

**人間確認:** OK を伝えてください

---

### Step 3-2: Checkout Session 作成 API（配送）

**実装内容:**

- `POST /api/checkout/create-session` を実装
  - リクエスト: カートアイテム配列 + `type: 'delivery'` + 配送先住所
  - 在庫仮押さえ（`reserved_stock + 1`）をトランザクションで処理
  - `orders` テーブルに `status: 'pending_payment'` でレコード作成
  - Stripe Checkout Session を作成（`expires_at = now + 30分`、`mode: 'payment'`、`currency: 'SEK'`）
  - 送料計算: 商品合計 < 799 SEK → 79 SEK を line_items に追加
  - Session ID を返す

**確認項目:**
- [ ] API を叩くと Stripe Session ID が返ること
- [ ] D1 に `status: pending_payment` の注文レコードが作成されること
- [ ] `products.reserved_stock` がインクリメントされること
- [ ] 商品合計 < 799 SEK のとき送料が line_items に含まれること
- [ ] 商品合計 ≥ 799 SEK のとき送料が含まれないこと

**人間確認:** API動作を確認して OK を伝えてください

---

### Step 3-3: 配送チェックアウト画面

**実装内容:**

- カートページに「配送 or 実物確認」選択UIを追加（`OrderTypeSelector.tsx`）
  - 配送選択時 → チェックアウト/配送 へ
- `/checkout/delivery` ページを作成
  - 住所入力フォーム（`DeliveryForm.tsx`）: 氏名・番地・市・郵便番号（スウェーデン形式バリデーション）
  - 「デフォルト住所を使用」ボタン（`users.default_address` があれば表示）
  - 注文サマリー（商品一覧・送料・合計）
  - 「Stripeで支払う」ボタン → `create-session` APIを呼び出し → Stripe Checkout へリダイレクト

**確認項目:**
- [ ] 住所フォームのバリデーションが動作すること（空欄・郵便番号形式）
- [ ] 「Stripeで支払う」を押すと Stripe Checkout ページに遷移すること（テスト環境）
- [ ] Stripe Checkout ページに商品名・金額が正しく表示されること
- [ ] 送料が正しく表示されること（799 SEK 未満の場合）

**人間確認:** ブラウザで操作して確認してから OK を伝えてください

---

### Step 3-4: Stripe Webhook 実装

**事前準備（人間が行う作業）:**

1. Stripe CLI をインストール（テスト用ローカル転送）:
   ```
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
2. 表示された `whsec_...` を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定

**実装内容:**

- `POST /api/webhooks/stripe` を実装
  - `stripe.webhooks.constructEvent()` で署名検証（失敗時 400）
  - `payment_intent.succeeded`:
    1. `stripe_checkout_session_id` で注文を検索（べき等チェック: 既に `paid` 以上なら 200 で終了）
    2. 注文 `status: pending_payment → paid`
    3. 在庫確定減算（`stock - 1`、`reserved_stock - 1`）をトランザクションで処理
    4. 顧客に注文確認メール送信（ノンブロッキング）
    5. 管理者に新規注文通知メール送信（ノンブロッキング）
  - `payment_intent.payment_failed`:
    1. 注文 `status: payment_failed`
    2. 在庫仮押さえ解除（`reserved_stock - 1`）
  - `checkout.session.expired`:
    1. 注文 `status: payment_failed`
    2. 在庫仮押さえ解除（`reserved_stock - 1`）
  - `charge.refunded`:
    1. 注文 `status: cancelled`

**確認項目:**
- [ ] Stripe CLI でテスト決済を完了すると `payment_intent.succeeded` が届くこと
- [ ] 注文の status が `paid` に更新されること
- [ ] `products.stock` が減算されること
- [ ] `products.reserved_stock` が減算されること
- [ ] 同じイベントを2回送っても二重処理されないこと（べき等性）
- [ ] Stripe CLI でテスト決済失敗を送ると `payment_failed` に更新されること

**人間確認:** Webhook 動作を確認して OK を伝えてください

---

### Step 3-5: 注文完了ページ

**実装内容:**

- `/checkout/complete` ページを作成
  - クエリパラメータ `session_id` から Stripe Session を取得
  - Session に紐づく注文レコードを取得（`stripe_checkout_session_id` で検索）
  - Webhook 未到着の場合（`status: pending_payment`）: 「処理中...」を表示し、3秒ごとにポーリング（最大30秒）
  - `status: paid` になったら完了画面を表示
  - 完了画面: 注文番号・商品一覧・合計金額・配送先住所
  - カートをクリア（localStorage から削除）

**確認項目:**
- [ ] テスト決済後に完了ページが表示されること
- [ ] 注文番号が `AH-YYYYMMDD-NNNN` 形式で表示されること
- [ ] カートが空になっていること

**人間確認:** ブラウザで実際に決済フローを通して確認してから OK を伝えてください

---

### Step 3-6: Cron による在庫仮押さえクリーンアップ

**実装内容:**

- `wrangler.toml` にCron設定を追加（`*/30 * * * *`）
- Cloudflare Worker の `scheduled` ハンドラを実装
  - `status: pending_payment` かつ `created_at < NOW - 30分` の注文を取得
  - 各注文の `reserved_stock` を解除
  - 注文 status を `payment_failed` に更新
  - （Stripe Session は期限切れ Webhook が来ていれば既に処理済みのため、べき等チェックを実施）

**確認項目:**
- [ ] `wrangler dev --test-scheduled` で手動実行できること
- [ ] 30分以上前の `pending_payment` 注文の仮押さえが解除されること
- [ ] `paid` 以上の注文は触られないこと

**人間確認:** 動作確認して OK を伝えてください

**Phase 3 完了後にコミット:** `feat: Phase 3 - Stripe決済（配送）`

---

## Phase 4: 実物確認ルート

### Step 4-1: 実物確認チェックアウト画面 + Checkout Session 作成

**実装内容:**

- カートの `OrderTypeSelector.tsx` に「実物確認」選択肢を追加
  - 選択すると受け渡し場所（Uppsala Central Station）と注意事項を表示
- `/checkout/inspection` ページを作成
  - 注意事項の表示（仕様書3-4のテキスト）と同意チェックボックス
  - 注文サマリー（商品一覧・合計金額）
  - 「Stripeで支払う」ボタン
- `POST /api/checkout/create-session` を `type: 'inspection'` に対応
  - `expires_at = NOW + 7日` を設定
  - `capture_method: 'automatic'`

**確認項目:**
- [ ] 「実物確認」を選択するとチェックアウト画面に遷移すること
- [ ] 注意事項に同意しないと決済ボタンが押せないこと
- [ ] テスト決済完了後、注文の `status: pending_inspection`、`expires_at` が7日後に設定されること

**人間確認:** ブラウザで操作して確認してから OK を伝えてください

---

### Step 4-2: 実物確認の注文完了画面

**実装内容:**

- `/checkout/complete` ページを `type: inspection` 時に対応
  - Instagram DM ボタンを表示: `https://www.instagram.com/animehubs_swe/` へのリンク
  - DMに貼り付ける定型文を表示（注文番号・受け渡し場所・期限日付き）
  - 期限日（`expires_at`）を明示表示
- 顧客への実物確認メール送信（Webhook 内で）

**確認項目:**
- [ ] 完了画面に Instagram DM ボタンが表示されること
- [ ] 定型文に注文番号・期限が含まれること
- [ ] 顧客メールが届くこと（Resend テスト）

**人間確認:** ブラウザで確認してから OK を伝えてください

---

### Step 4-3: Cron による自動キャンセル（実物確認）

**実装内容:**

- Cron ハンドラに `auto-cancel-expired-inspections` 処理を追加（毎時実行）
  - `type: inspection` かつ `status: pending_inspection` かつ `expires_at < NOW()` を取得
  - Stripe 返金 API を呼び出し（`stripe.refunds.create`）
  - 成功: 注文 `status: cancelled`、`cancelled_reason: expired`
  - 失敗: 管理者にアラートメール送信（`ADMIN_EMAILS` 宛て）、次の Cron 実行時にリトライ
  - 在庫を +1 復元
  - 顧客に自動キャンセル通知メール送信

**確認項目:**
- [ ] `wrangler dev --test-scheduled` で手動実行できること
- [ ] `expires_at` 過去の `pending_inspection` 注文がキャンセル・返金されること
- [ ] 在庫が +1 されること
- [ ] 顧客にメールが届くこと

**人間確認:** 動作確認して OK を伝えてください

---

### Step 4-4: 管理画面 — 実物確認操作

**実装内容:**

- 管理画面の注文一覧（`/admin/orders`）を更新
  - `pending_inspection` 注文に「受取完了」「返金」ボタンを追加
  - 期限日と残り日数を表示
- `PATCH /api/admin/orders/[id]/status` を更新
  - `pending_inspection → completed` への遷移を実装
- `POST /api/admin/orders/[id]/refund` を実装（実物確認キャンセル）
  - `stripe.refunds.create()` 呼び出し
  - 在庫 +1 復元
  - 顧客にキャンセルメール送信

**確認項目:**
- [ ] 管理画面で `pending_inspection` 注文の「受取完了」が動作すること
- [ ] 「返金」ボタン押下後 Stripe ダッシュボードで返金が確認できること（テスト環境）
- [ ] 返金後に注文 `status: cancelled` になること
- [ ] 在庫が +1 されること

**人間確認:** 管理画面で操作して確認してから OK を伝えてください

**Phase 4 完了後にコミット:** `feat: Phase 4 - 実物確認ルート`

---

## Phase 5: 注文履歴・マイページ・キャンセル申請

### Step 5-1: キャンセルリクエスト機能

**実装内容:**

- `POST /api/orders/[id]/cancel` を実装
  - 認証チェック + 本人チェック（`order.user_id === session.user.id`）
  - `status: paid` のみ受け付ける（それ以外は 400）
  - 注文 `status: cancellation_requested` に更新
  - 管理者にキャンセルリクエスト通知メール送信
- 管理画面に「承認」「却下」ボタンを追加
  - 承認: Stripe 返金 → 在庫 +1 → `status: cancelled` → 顧客にキャンセル完了メール
  - 却下: `status: paid` に戻す → 顧客に却下メール

**確認項目:**
- [ ] キャンセルリクエストAPIが正常動作すること
- [ ] 他人の注文はキャンセルできないこと（403）
- [ ] `shipped` 以上の注文はキャンセルできないこと（400）
- [ ] 管理者の承認で返金・在庫復元が自動実行されること
- [ ] 管理者の却下で `paid` に戻ること

**人間確認:** 動作確認して OK を伝えてください

---

### Step 5-2: 注文履歴ページ

**実装内容:**

- `GET /api/orders` を実装（`user_id` でフィルタ、降順、ページネーション）
- `/orders` ページを作成
  - 注文一覧（注文番号・日付・合計金額・ステータスバッジ・注文タイプ）
  - ページネーション

**確認項目:**
- [ ] ログイン後に自分の注文一覧が表示されること
- [ ] 他人の注文が表示されないこと
- [ ] ステータスバッジが正しく表示されること

**人間確認:** ブラウザで確認してから OK を伝えてください

---

### Step 5-3: 注文詳細ページ

**実装内容:**

- `/orders/[id]` ページを作成
  - 注文詳細（商品一覧・金額・配送先・ステータス・受け渡し場所）
  - `type: delivery` かつ `status: paid` の場合 → 「キャンセルリクエスト」ボタン
  - `type: inspection` かつ `status: pending_inspection` の場合 → 期限カウントダウン + Instagram DM ボタン
  - `status: cancellation_requested` の場合 → 「承認待ち」表示

**確認項目:**
- [ ] 注文詳細が正しく表示されること
- [ ] 権限のない注文IDにアクセスすると 404 or リダイレクトされること
- [ ] キャンセルボタンが適切なステータスでのみ表示されること

**人間確認:** ブラウザで確認してから OK を伝えてください

---

### Step 5-4: マイページ

**実装内容:**

- `/account` ページを作成
  - プロフィール表示（Googleから取得: 名前・メール・アバター）
  - デフォルト配送先住所の登録・編集フォーム（`users.default_address` を更新）
  - `PATCH /api/account/address` を実装

**確認項目:**
- [ ] Googleのプロフィール情報が表示されること
- [ ] デフォルト住所の保存・更新が動作すること
- [ ] 保存後にチェックアウト画面で「デフォルト住所を使用」が使えること

**人間確認:** ブラウザで確認してから OK を伝えてください

**Phase 5 完了後にコミット:** `feat: Phase 5 - 注文履歴・マイページ・キャンセル申請`

---

## Phase 6: 管理画面強化・メール・仕上げ

### Step 6-1: 管理ダッシュボード強化

**実装内容:**

- `/admin` ダッシュボードを更新
  - 今月の売上合計（`status: completed`、SEK表示）
  - 注文件数（配送 / 実物確認 別）
  - `pending_inspection` 件数と期限が近い注文のアラート（3日以内）
  - `cancellation_requested` 件数のアラート

**確認項目:**
- [ ] 売上・注文件数が正しく集計されること
- [ ] 期限切れ間近の実物確認注文がハイライト表示されること

**人間確認:** ブラウザで確認してから OK を伝えてください

---

### Step 6-2: 発送処理（shipped への更新）

**実装内容:**

- 管理画面の注文詳細に「発送済みにする」ボタンを追加
  - `status: paid → shipped` に更新
  - 追跡番号入力フィールド（任意・`notes` に保存）
  - 顧客に発送通知メール送信
- 管理画面の注文一覧に `shipped` 注文のステータス表示

**確認項目:**
- [ ] 「発送済みにする」が動作すること
- [ ] 顧客に発送通知メールが届くこと
- [ ] 注文一覧でステータスが更新されること

**人間確認:** 動作確認して OK を伝えてください

---

### Step 6-3: SEO 対応

**実装内容:**

- 各ページの `metadata` を設定
  - トップページ: サイト名・説明・OGP画像
  - 商品一覧: カテゴリ・検索ワードを含むタイトル
  - 商品詳細: 商品名・価格・画像を OGP に設定
- `sitemap.xml` の更新（商品一覧ページを追加）
- `robots.txt` の確認（管理画面・API を noindex）

**確認項目:**
- [ ] `<title>` と `<meta description>` が各ページで設定されていること
- [ ] OGP タグが商品詳細ページで設定されていること
- [ ] Lighthouse SEO スコア > 90

**人間確認:** Lighthouse で確認してから OK を伝えてください

---

### Step 6-4: パフォーマンス最適化

**実装内容:**

- 画像最適化: `next/image` への変換確認
- 商品一覧のページネーション確認（初期表示件数: 20件）
- React Server Component / Client Component の使い分け見直し
- `loading.tsx` の追加（各主要ルート）

**確認項目:**
- [ ] Lighthouse Performance > 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1

**人間確認:** Lighthouse スコアを共有してから OK を伝えてください

---

### Step 6-5: E2E テスト

**実装内容:**

Playwright でクリティカルフローのテストを作成:

1. `通常購入フロー.spec.ts`: 商品選択 → カート → 配送決済（Stripe テストカード）→ 完了
2. `実物確認フロー.spec.ts`: 選択 → 事前決済 → 完了画面（インスタDMボタン確認）
3. `お気に入りフロー.spec.ts`: いいね追加 → 一覧確認 → カートへ移動
4. `キャンセルフロー.spec.ts`: キャンセルリクエスト → 管理者承認 → 返金確認

**確認項目:**
- [ ] 全 E2E テストが pass すること
- [ ] `npm run test` のユニット・結合テストも pass すること

**人間確認:** テスト結果を確認してから OK を伝えてください

**Phase 6 完了後にコミット:** `feat: Phase 6 - 管理画面強化・SEO・E2Eテスト`

---

## 実装開始前チェックリスト

Phase 1 着手前に以下を確認してください:

- [ ] Google Cloud Console（プロジェクト `523153073330`）で OAuth クライアント ID を発行済み
- [ ] Stripe ダッシュボードで テスト用 API キー（`sk_test_...`、`pk_test_...`）を確認済み
- [ ] `.env.local` に上記キーを設定済み
- [ ] `npm install` が通ること
- [ ] `npm run dev` でローカルサーバーが起動すること

---

## デプロイ前チェックリスト（全フェーズ完了後）

- [ ] Stripe ダッシュボードで **本番** Webhook エンドポイントを登録（`https://your-domain.pages.dev/api/webhooks/stripe`）
- [ ] Stripe を テストモード → 本番モードに切り替え（APIキーを差し替え）
- [ ] Google Cloud Console でリダイレクトURIに本番ドメインを追加
- [ ] Cloudflare の環境変数（`wrangler secret put`）に本番値を設定
- [ ] `wrangler d1 execute animehubs-db --remote --file=<migration>` で本番DBにマイグレーション適用
