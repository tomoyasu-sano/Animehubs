# 仕様書: 実物確認フロー v2（予約 → 対面 → 決済）

作成日: 2026-04-02
更新日: 2026-04-02（レビュー指摘12件反映）
ステータス: **確定**

---

## 1. 概要

### 変更の目的

実物確認ルートを「事前全額決済 → 返金」方式から「予約（在庫確保のみ） → 対面確認後にStripe決済」方式に変更する。

### 変更前（v1: 今回廃止）

```
カート → 事前Stripe全額決済 → 対面確認 → 満足なら完了 / 不満なら返金
```

**問題点:** 返金フローが複雑、顧客の心理的ハードル高い

### 変更後（v2: 今回実装）

```
カート → 予約（在庫確保・決済なし） → 対面確認 → 購入決定ならStripe決済 / キャンセルなら管理者が手動解除
```

**メリット:** 顧客は実物を見てから支払い判断できる。返金フロー不要。

---

## 2. 配送フロー（変更なし）

既存の配送フローは一切変更しない。

```
カート → 配送チェックアウト（住所入力） → Stripe全額決済 → Webhook → paid → 発送 → completed
```

---

## 3. 実物確認フロー（v2）

### 3-1. フロー全体図

```
[顧客: オンライン — ログイン必須]
  1. カートで「In-Person Inspection」を選択
  2. /checkout/inspection で注意事項に同意 → 予約確定（★ログイン必須）
     → 在庫確保（reserved_stock +N）
     → 注文ステータス: reserved
     → 注文番号発行（AH-YYYYMMDD-NNNN）
     → 確認メール送信（注文番号 + Instagram DM案内 + 注文ページURL）
  3. /orders/[id] にリダイレクト（予約完了表示）

[顧客 ⇔ 店主: Instagram DM（メール連絡も可）]
  4. DMまたはメールで日時・場所を調整

[対面当日]
  5-A. 購入する場合:
       → 顧客がアプリで /orders/[id] を開く（★ログイン必須）
       → 「Pay Now」ボタン → Stripe Checkout → 決済完了
       → ステータス: reserved → paid
       → 商品引き渡し（対面、配送なし）
       → 管理者が管理画面で「受取完了」→ completed

  5-B. キャンセルする場合（対面前 or 対面時に不満）:
       → 管理者が管理画面で「キャンセル」
       → 在庫仮押さえ解除（reserved_stock -N）
       → ステータス: reserved → cancelled
       → 顧客にキャンセルメール送信

[自動処理]
  6. 予約から7日経過 → Cron（毎時実行: 0 * * * *）で自動キャンセル + 在庫仮押さえ解除
```

> **認証要件:** 予約作成（/checkout/inspection）、注文閲覧（/orders/[id]）、決済（Pay Now）のすべてでログイン必須。カートまでの閲覧はゲスト可。

> **重要: 実物確認の `paid` 後は返金なし**
> 顧客が実物を確認してから決済しているため、対面販売扱い。
> スウェーデンの Distansavtalslagen（通信販売法）の14日クーリングオフは適用外。
> 万一のトラブルは管理者がStripeダッシュボード or 銀行振込で個別対応。
> アプリ上に inspection `paid` 後の返金ボタンは付けない。

> **連絡手段:** Instagram DMを主手段とするが、予約確認メールに返信先メールアドレスも記載し、DMが使えない顧客にも対応可能とする。将来的にアプリ内メッセージ機能を検討。

### 3-2. ステータス遷移

```
[予約作成時]
    reserved（在庫確保済み・未決済）
         │
         ├── 顧客が決済 ──→ paid（決済完了）
         │                      │
         │                      └── 管理者が受取完了 ──→ completed
         │
         ├── 管理者がキャンセル ──→ cancelled（cancelled_reason: admin_cancel）
         │
         └── 7日経過（Cron）──→ cancelled（cancelled_reason: expired）
```

**注意:**
- `reserved` → `paid` のみ顧客が操作可能（Stripe決済）
- `reserved` → `cancelled` は管理者 or Cron のみ
- `paid` → `completed` は管理者のみ
- `paid` 後の返金はアプリ上で提供しない（対面販売のため返金義務なし。個別対応が必要な場合はStripeダッシュボード or 銀行振込で手動処理）
- 一度 `cancelled` / `completed` になったら変更不可

### 3-3. 在庫管理

| タイミング | stock | reserved_stock | 説明 |
|-----------|-------|----------------|------|
| 予約作成 | 変化なし | +N | 仮押さえ |
| 決済完了（paid） | -N | -N | 在庫確定減算 |
| キャンセル（reserved → cancelled） | 変化なし | -N | 仮押さえ解除 |

→ `reserved`状態のキャンセルは `releaseReservedStock()` を使用（stockは触らない）
→ `paid`後の在庫確定は既存の `confirmStockDeduction()` を使用

**有効在庫の表示:** 商品一覧・商品詳細・カートでの在庫表示は `stock - reserved_stock` で計算する。仮押さえ分は「在庫なし」として表示し、「在庫あり表示なのに購入不可」のケースを防ぐ。

### 3-4. 注意事項テキスト（予約前に表示）

i18nキーとして `en.json` / `sv.json` に定義する（3-4のテキストは日本語の仕様記述であり、実際のUIは翻訳キーで管理）。

**英語:**
> With In-Person Inspection, your items will be reserved (stock held) and you pay after inspecting them in person. No shipping — items are handed over at the meeting.
> If the meeting is not completed within 7 days, the reservation will be automatically cancelled.
> For safety, the meeting location will be a public place (e.g. train station, shopping center).
> After inspecting the items, you can pay via Stripe on this app, and receive the items on the spot.

**スウェーデン語:** 対応する sv.json キーに翻訳を格納。

### 3-5. 重複予約制限

1ユーザーあたり、`status: reserved`（未決済）の注文は **最大3件** まで。
4件目以降の予約作成時はエラー（「You have too many active reservations. Please complete or cancel existing reservations first.」）。

理由: 在庫独占の防止。3件は「複数商品を別々に検討したい」ユースケースを考慮。

---

## 4. ページ・UI設計

### 4-1. /checkout/inspection（予約確認ページ）— 変更

**前提:** ログイン必須。未ログインなら /auth/login にリダイレクト（既存のmiddleware認証で対応）。

**変更前:** Stripe決済 → Stripe Checkoutへリダイレクト
**変更後:** 予約確認 → 予約API呼び出し → /orders/[id] へリダイレクト

表示内容:
- 注意事項（3-4のテキスト、i18nキーで管理）
- 受渡場所: Uppsala Central Station area
- 同意チェックボックス（必須）
- メールアドレス入力（確認メール送信先、Googleログインのメールでプリフィル）
- 注文サマリー（商品一覧・合計金額）※送料なし
- 「Reserve Items（予約する）」ボタン（Stripeボタンではない）

**予約成功後のクライアント動作:**
1. APIレスポンスで `orderId` を受け取る
2. `clearCart()` でlocalStorageのカートをクリア（APIレスポンス受信直後、リダイレクト前）
3. `router.replace(`/orders/${orderId}`)` で遷移（`replace` で履歴置換 — ブラウザバックで /checkout/inspection に戻らない）

### 4-2. 予約完了 → /orders/[id] にリダイレクト

予約作成後、`router.replace` で `/orders/[id]` に遷移（pushではなくreplaceで履歴置換）。

理由:
- 決済リンクとして後から再利用できるURLになる
- 「後から再表示」の要件を自然に満たす
- 完了ページを別に作る必要がない
- replace により /checkout/inspection へのブラウザバックを防止（重複予約制限3件で最終ガードされるが、UX上もブロック）

### 4-3. /orders/[id]（注文詳細ページ）— 新規作成

**全注文タイプ共通の注文詳細ページ。** ログイン必須、本人の注文のみ閲覧可能（order.userId !== session.user.id → 404）。

表示内容はステータスとタイプに応じて変化:

| type | status | 表示内容 |
|------|--------|---------|
| inspection | reserved | 注文情報 + Instagram DM案内 + メール連絡先 + 期限（残日数） + **「Pay Now」ボタン** |
| inspection | reserved（期限切れ） | 注文情報 + 「予約期限切れ — まもなくキャンセルされます」+ Pay Nowボタン非活性 |
| inspection | paid | 注文情報 + 「決済完了。商品の受け渡しをお待ちください」 |
| inspection | completed | 注文情報 + 「完了」 |
| inspection | cancelled | 注文情報 + キャンセル理由表示 |
| delivery | paid | 注文情報 + 配送先住所 |
| delivery | shipped | 注文情報 + 配送先住所 |
| delivery | completed | 注文情報 + 配送先住所 |

**「Pay Now」ボタンの動作:**
1. `POST /api/checkout/create-session` を呼び出し（`{ orderId: "uuid" }`）
2. Stripe Checkout Sessionを作成
3. Stripe Checkoutページにリダイレクト
4. 決済完了 → Webhook → `reserved` → `paid` + `confirmStockDeduction`
5. Stripe success_url → `/orders/[id]?payment=success` にリダイレクト（/checkout/complete ではなく直接 /orders/[id] へ。カートクリア不要 — 予約時にクリア済み。完了ページのポーリングも不要 — 注文詳細ページでステータスをそのまま表示）
   - `?payment=success` パラメータがある場合、ページ上部に「Payment completed!」の一時バナーを表示（3秒後に自動非表示）
   - Webhookが未到着（まだreserved）の場合は、3秒間隔でポーリング（最大30秒）してpaidを待つ

**「Pay Now」ボタンの無効化条件:**
- `expires_at < NOW`（期限切れ）: ボタン非活性 + 「Reservation expired」メッセージ
- API側でも期限チェック（Cronが走る前の猶予期間中に押された場合のガード）

**期限切れ時のUI:**
- ボタンはグレーアウト（disabled）
- テキスト: 「This reservation has expired and will be cancelled shortly.」
- 背景色変更で視覚的に期限切れを強調
- **判定方法:** クライアント側で `expires_at` と `Date.now()` をリアルタイム比較（サーバー側Cronは毎時実行のため最大59分のラグあり。UIではクライアント時刻で即座に期限切れを表示し、Pay Nowを無効化する。APIでも二重チェック）

### 4-4. /orders（注文一覧ページ）— 新規作成

ログインユーザーの全注文一覧。

表示: 注文番号・日付・タイプ・ステータスバッジ・金額 → クリックで /orders/[id] へ

**ページネーション:** APIレベルで `?page=1&limit=20` をサポート。初期実装ではUI側は「Load More」ボタンで追加読み込み。

**ヘッダーナビゲーションにリンクを追加**（ログイン時のみ表示）
- デスクトップ: ヘッダー右側に「My Orders」リンク
- モバイル: ハンバーガーメニュー内に追加（Favorites の下）

**フィルタ・ソート:** 初期実装ではなし。注文数が増えた段階で Phase 5以降にステータスフィルタ・タイプフィルタを追加検討。

### 4-5. 管理画面 /admin/orders — 変更

**inspection注文:**

| ステータス | ボタン | 処理 |
|-----------|--------|------|
| reserved | **キャンセル** | 在庫仮押さえ解除（reserved_stock -N）→ cancelled。Stripe返金不要（未決済） |
| paid | **受取完了** | paid → completed |
| paid | 返金ボタンなし | 対面販売のため返金義務なし。個別対応はStripeダッシュボードで手動対応 |

**delivery注文:**（既存のまま）

| ステータス | ボタン | 処理 |
|-----------|--------|------|
| paid | **返金** | Stripe返金 + 在庫復元（stock +N）→ cancelled。reserved_stockは変化なし（delivery のpaid時点で既にconfirmStockDeductionでreserved_stock -N済み） |
| paid | **受取完了** | paid → completed（将来的にshipped経由も可） |

---

## 5. API設計

### 5-1. POST /api/checkout/reserve（新規）

予約作成API。Stripe決済なし。**ログイン必須。**

リクエスト:
```json
{
  "items": [{ "productId": "uuid", "quantity": 1 }],
  "email": "customer@example.com"
}
```

処理:
1. 認証チェック（`auth()` — 未ログインなら 401）
2. バリデーション（items: 必須・UUID形式・数量1-10・最大20件、email: 必須・形式チェック）
3. **重複予約チェック**: ユーザーの `status: reserved` 注文数をCOUNT。3件以上なら 429 Too Many Requests
   - **レースコンディション対策:** D1/SQLiteはトランザクション非対応のため、DB制約での厳密な排他は困難。COUNT→INSERTの間に別リクエストが通る可能性はあるが、3件制限は「悪意ある在庫独占の防止」が目的であり、稀に4件目が通るケースは実害が小さい。厳密な制御はコスト対効果から見送る。
4. 商品情報取得、有効在庫チェック（`stock - reserved_stock >= quantity`）
5. 注文番号生成（`AH-YYYYMMDD-NNNN`、日次リセット連番、UNIQUE制約で衝突保護）
6. **在庫仮押さえ（アトミックUPDATE）:**
   ```sql
   UPDATE products
   SET reserved_stock = reserved_stock + :quantity, updated_at = :now
   WHERE id = :product_id AND (stock - reserved_stock) >= :quantity
   ```
   → WHERE句で在庫チェックとUPDATEを1文で実行（TOCTOU防止）。影響行数が0の場合は在庫不足として409を返す。
   → 既存の配送フロー（createOrder）と同じパターン。
7. 注文レコード作成（status: reserved、expires_at: NOW + 7日）
8. 確認メール送信（ノンブロッキング、失敗時はconsole.errorのみ。リトライなし — メール不着はクリティカルではない）

**カートクリアのタイミング:** クライアント側（InspectionForm.tsx）で、APIレスポンス成功を受け取った直後・`router.replace` 前に `clearCart()` を実行。これが唯一のカートクリアポイント。Pay Now 決済完了時にはカートクリアしない（既にクリア済み）。

レスポンス:
```json
{ "orderId": "uuid", "orderNumber": "AH-20260402-0001" }
```

エラーレスポンス:
- 401: Unauthorized
- 400: バリデーションエラー
- 409: 在庫不足
- 429: `{ "error": "Too many active reservations (max 3)" }`

### 5-2. POST /api/checkout/create-session — 変更

既存APIに `orderId` パラメータを追加。reserved注文の決済用。

**分岐判定:** リクエストボディに `orderId` が存在すればパターンB、なければパターンA。

**パターンA（既存: delivery用）:** `orderId` なし
```json
{
  "items": [...],
  "type": "delivery",
  "email": "...",
  "shippingAddress": {...}
}
```

**パターンB（新規: inspection予約の決済用）:** `orderId` あり
```json
{
  "orderId": "uuid"
}
```

処理（パターンB: orderId指定時）:
1. 認証チェック + 本人チェック（order.userId === session.user.id、不一致なら 403）
2. 注文取得、ステータス確認（`reserved` のみ受付、それ以外は 400）
3. **期限チェック**（`expires_at > NOW`、期限切れなら 400 `{ "error": "Reservation has expired" }`）
4. **既存Stripe Session処理:** 注文に `stripeCheckoutSessionId` が既に設定されている場合、`stripe.checkout.sessions.expire()` で無効化してから新規作成（途中離脱→再操作のケースに対応。expire失敗はcatchして続行 — 既にexpired/completedの場合エラーになるため）
5. Stripe Checkout Session作成（注文の商品・金額を使用、送料なし）
   - **Session有効期限:** `expires_at = NOW + 30分`（配送フローと同じ。予約期限7日とは独立。顧客がPay Nowを押すたびに30分のSession窓が開く）
6. metadata に `order_id` と `order_type: "inspection"` を含める
7. stripeCheckoutSessionIdを注文に保存（UPDATE）
8. Session URLを返す

### 5-3. Webhook変更

`checkout.session.completed` のハンドリング変更:
- metadata の `order_id` で注文を検索（既存の checkout_session_id 検索も維持）
- `reserved` → `paid` の遷移を追加（既存の `pending_payment` → `paid` と並列）
- `reserved` → `paid` 時: `confirmStockDeduction`（在庫確定減算: stock -N, reserved_stock -N）
- メール送信（決済完了メール）

**冪等性ガード（既存実装を維持・拡張）:**
- 注文ステータスが `reserved` でも `pending_payment` でもない場合は処理をスキップして 200 を返す
- 既存の delivery フローで `pending_payment` → `paid` の冪等性ガードは実装済み（`if (order.status !== "pending_payment") return`）
- これを `if (order.status !== "pending_payment" && order.status !== "reserved") return` に拡張
- → Webhookが重複配信されても、2回目は何もせず 200 OK

### 5-4. POST /api/admin/orders/[id]/cancel（新規）

管理者によるキャンセル。**inspection の `reserved` 状態の注文のみ。**

処理:
1. 管理者認証チェック
2. 注文取得、ステータス確認（`reserved` のみ。`paid` 後のキャンセルはStripeダッシュボードで手動対応する旨をエラーメッセージに明記）
3. 在庫仮押さえ解除（`releaseReservedStock`）
4. ステータス更新（cancelled、reason: admin_cancel）
5. 顧客にキャンセルメール送信（ノンブロッキング）

エラーレスポンス:
- `paid` 注文に対して呼ばれた場合: 400 `{ "error": "Cannot cancel a paid order from admin panel. Use Stripe Dashboard for manual refunds." }`

### 5-5. PATCH /api/admin/orders/[id]/status — 変更

許可する遷移:
- `paid → completed`（inspection: 受取完了、delivery: 受取完了）
- `paid → shipped`（delivery のみ）
- `shipped → delivered`（delivery のみ）

`reserved → cancelled` は 5-4 の専用APIで処理（在庫解除ロジックが伴うため）。

### 5-6. GET /api/orders/[id]（新規）

顧客用注文詳細API。**ログイン必須。**

処理:
1. 認証チェック
2. 注文取得 + 本人チェック（order.userId !== session.user.id → 404）
   - **404を返す理由:** 403だと「その注文IDは存在するが権限がない」と情報を漏らす。UUID v4のため推測は実質不可能だが、情報開示を最小化する原則に従い404で統一。
3. 注文情報を返す（メールマスクなし — 本人のため）

### 5-7. GET /api/orders（新規）

顧客用注文一覧API。**ログイン必須。**

処理:
1. 認証チェック
2. userId でフィルタ、createdAt 降順
3. **ページネーション:** `?page=1&limit=20`（デフォルト page=1, limit=20, 最大limit=50）
4. レスポンスに `total`（全件数）を含める

レスポンス:
```json
{
  "orders": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 5-8. Cron: cancel-expired-inspections — 変更

**実行頻度:** 毎時（`0 * * * *`）— Cloudflare Workers Cron Trigger

変更前: Stripe返金 + 在庫復元（stock +N）
変更後: 在庫仮押さえ解除（reserved_stock -N）のみ。Stripe返金不要（未決済のため）。

対象: `type: inspection` かつ `status: reserved` かつ `expires_at < NOW`

**障害対応:**
- 各注文の処理を try-catch で個別ラップ（1件失敗しても他は処理続行）
- 失敗件数をレスポンスに含める（`{ checked, cancelled, failed }`）
- 失敗が1件以上の場合、管理者にアラートメール送信（`ADMIN_EMAILS` 宛て）
- 失敗した注文は次回Cron実行時に再試行される（ステータスが `reserved` のまま残るため）
- Cron自体が起動しない障害: Cloudflare のステータス監視に委ねる（アプリ側でのリトライは不要）

---

## 6. メール

### 6-1. 予約確認メール（新規: 予約作成時）

件名: `Reservation Confirmed - {orderNumber}`

内容:
- 注文番号
- 商品一覧・合計金額
- 「Instagram DMで日時を調整してください」
- 「DMが使えない場合は {CONTACT_EMAIL} にメールでもご連絡いただけます」
- 「対面確認後、注文ページから決済してください」
- 注文ページURL: `{BASE_URL}/{locale}/orders/{orderId}`
- 期限: 7日後の日付
- 注意: 「配送は行いません。対面での受け渡しとなります。」

失敗時: console.error でログ出力。リトライなし（メール不着はクリティカルではない。顧客は注文ページURLを画面で確認済み）。

### 6-2. 決済完了メール（既存: Webhook内で送信）

既存の注文確認メールをそのまま使用。inspection注文の場合は「商品の受け渡しをお待ちください」を追加。

### 6-3. 自動キャンセルメール（変更）

件名: `Reservation Cancelled - {orderNumber}`

内容: 「7日間の予約期限が過ぎたため、予約がキャンセルされました。」
（返金の言及は不要 — 未決済のため）

失敗時: console.error でログ出力。**1回リトライ**（2秒後）。2回目も失敗なら諦める。
理由: 自動キャンセルは顧客が気づかない可能性があるため、予約確認メールより重要度が高い。ただし `/orders/[id]` でもキャンセル状態は確認できるため、リトライは1回で十分。

---

## 7. DBスキーマ変更

### OrderStatus 型に `reserved` を追加

```typescript
export type OrderStatus =
  | "reserved"           // ★追加: 予約済み・在庫確保・未決済
  | "pending_payment"
  | "paid"
  | "cancellation_requested"
  | "pending_inspection"  // ★Phase 4完了後に削除（DBマイグレーション完了確認後）
  | "shipped"
  | "completed"
  | "payment_failed"
  | "cancelled";
```

**`pending_inspection` の削除タイミング:** Phase 4 の実装完了・テスト通過・DBマイグレーション（既存データのcancelled変換）完了を確認した後、型定義から削除する。Phase 4 コミット内で削除する（残留させない）。

ordersテーブル自体のスキーマ変更は不要（TEXT型なので新ステータス追加は自由）。

### 注文番号の連番管理

形式: `AH-YYYYMMDD-NNNN`（NNNN部分は日次リセット連番）

**タイムゾーン:** UTC で統一。Cloudflare Workers の実行環境はUTCのため、`new Date().toISOString().slice(0, 10)` でYYYYMMDD部分を取得。スウェーデン時間（CET/CEST）との最大2時間のズレは許容する（注文番号は表示用IDであり、業務上の日付管理には `createdAt` タイムスタンプを使用）。

採番ロジック:
1. `orders` テーブルから `order_date = 今日(UTC)` の件数を COUNT
2. COUNT + 1 を NNNN に設定
3. `order_number` カラムの UNIQUE 制約で衝突を検出
4. UNIQUE 制約違反時はリトライ（MAX 3回）

→ 同日の並行リクエストでの衝突は UNIQUE 制約 + リトライで保護。
→ 現在の実装（Phase 3）は COUNT ベースで実装済み。リトライは Phase 5 以降で強化。

### pending_inspection の既存データ移行

テスト環境のため、既存の `pending_inspection` 注文は存在しない（Phase 3 のテスト決済データのみ）。

方針:
- 既存 `pending_inspection` 注文が存在する場合 → `cancelled`（reason: `migration_v2`）に一括更新
- マイグレーションスクリプト: 実装ステップ 4-4 でCron変更時に一緒に実施
- 本番デプロイ前に手動実行: `UPDATE orders SET status = 'cancelled', cancelled_reason = 'migration_v2' WHERE status = 'pending_inspection'`

---

## 8. 実装ステップ

| Step | 内容 | 概要 |
|------|------|------|
| 4-1 | 予約API + チェックアウト画面変更 | /api/checkout/reserve 新規（重複予約制限込み）、/checkout/inspection を決済なしに変更 |
| 4-2 | 注文詳細ページ + 決済ボタン | /orders/[id] 新規（期限切れUI込み）、Pay Now → create-session（orderId対応）、Webhook変更 |
| 4-3 | 注文一覧ページ + ナビ | /orders 新規（ページネーション込み）、ヘッダーにリンク追加 |
| 4-4 | 管理画面変更 + Cron変更 | reserved注文のキャンセルボタン、Cronを返金なしに変更、pending_inspectionマイグレーション |

---

## 9. 既存コードへの影響

### 削除対象（Phase 3で作ったinspection関連）
- `InspectionForm.tsx` の Stripe決済ロジック → 予約API呼び出しに変更
- `/api/cron/cancel-expired-inspections` の Stripe返金ロジック → 在庫仮押さえ解除のみに変更
- `/api/admin/orders/[id]/refund` の inspection 対応 → reserved状態はrefund不要、cancel APIに変更
- Webhookの `pending_inspection` 分岐 → `reserved` → `paid` に変更

### 変更なし
- 配送フロー（delivery）のすべてのコード
- Stripe SDK設定
- DeliveryForm, CartSummary, OrderTypeSelector
- 既存のWebhookの `paid` / `payment_failed` / `charge.refunded` ハンドリング

### 有効在庫表示の確認

商品一覧・詳細で `stock - reserved_stock` を使っているか確認し、未対応なら修正する。
（現在の商品APIが `stock` のみ返している場合、`availableStock: stock - reserved_stock` を追加）
