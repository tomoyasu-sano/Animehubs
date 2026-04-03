# Phase 3（Stripe配送決済） → Phase 4（実物確認ルート） 引き継ぎ

## 生成日時: 2026-04-02

## Phase 3 完了サマリー

### 実装した内容
- Stripe SDK統合（`stripe@21.0.1` + `@stripe/stripe-js@9.0.1`）
- `Stripe.createFetchHttpClient()` でCloudflare Workers対応
- `POST /api/checkout/create-session`: Checkout Session作成 + 条件付きUPDATEで在庫仮押さえ（TOCTOU防止）
- `POST /api/webhooks/stripe`: `constructEventAsync` で署名検証、checkout.session.completed/expired/charge.refunded 処理
- `GET /api/orders/by-session`: session_idフォーマット検証 + メールマスク
- `POST /api/cron/cleanup-expired`: CRON_SECRET必須認証、期限切れ仮押さえ解除
- 配送チェックアウトUI: メール + 氏名 + 住所フォーム + 送料計算（799 SEK以上無料）
- 注文完了ページ: Webhookポーリング（3秒x10回）+ カートクリア
- OrderTypeSelector: delivery/inspection選択をカートに統合
- 注文確認メール + 管理者通知メール（escapeHtml適用）
- middleware: /checkout/complete を認証保護から除外（Stripeリダイレクト対応）
- success_url/cancel_url: Refererからロケール自動取得、Originからベース URL取得

### テスト結果
| カテゴリ | 結果 |
|----------|------|
| 単体テスト | 156 passed, 3 skipped |
| ESLint | 0 errors, 0 warnings |
| TypeScript | 0 errors |
| コードレビュー | CRITICAL: 2修正済み, HIGH: 4修正済み |
| 人間テスト | PASS（Stripe Sandbox テスト決済完了、Webhook 200 OK確認） |

### 未解決事項（Phase 4以降で対応）
- 注文番号の重複対策: MAX(order_seq) + リトライ（現状はCOUNT + UNIQUE制約で保護、低リスク）
- Resend API Key未設定時のガード（現状はランタイムエラー）
- `product.images` のJSON.parse try/catch（現状はスキーマデフォルト `"[]"` で保護）
- 既存v1チェックアウトフロー（/checkout, /checkout/confirm, /api/reservations）の廃止

### 技術的な判断メモ
- **Stripe FetchHttpClient**: Cloudflare Workersでは`https.request`が使えないため、`Stripe.createFetchHttpClient()`を使用
- **constructEventAsync**: 同様にNode.js cryptoが使えないため、async版でWebhook署名検証
- **TOCTOU防止**: `WHERE (stock - reserved_stock) >= quantity` の条件付きUPDATEで原子的に在庫確保
- **完了ページの認証除外**: Stripeリダイレクト時にセッションCookieが不安定になるため、`/checkout/complete`を保護対象から除外。session_idフォーマット検証で代替保護
- **孤立Stripe Session防止**: 注文作成失敗時に`stripe.checkout.sessions.expire()`を呼び出し
- **ロケール自動取得**: Refererヘッダーから`/en/`or`/sv/`を判定してStripe URL に反映

---

## Phase 4 指示

### 実装範囲
Phase 4は実物確認ルート。implementation guide `specs/20260402_implementation_guide.md` の Phase 4（Step 4-1 〜 4-4）を参照。

主な実装:
1. `/checkout/inspection` ページ: 注意事項同意 + Stripe決済（`create-session` APIをtype='inspection'対応）
2. 注文完了画面の inspection 対応: Instagram DMボタン + 期限表示（既に実装済み）
3. Cron: 期限切れ inspection 注文の自動キャンセル + Stripe返金
4. 管理画面: `pending_inspection` 注文の「受取完了」「返金」ボタン

### 前提条件
- 認証基盤: src/lib/auth-v2.ts（NextAuth v5 + Google OAuth + JWT戦略）
- Stripe: src/lib/stripe.ts（FetchHttpClient）
- DB: src/lib/db/order-queries.ts（createOrder, updateOrderStatus, releaseReservedStock, confirmStockDeduction）
- Webhook: src/app/api/webhooks/stripe/route.ts（checkout.session.completed で inspection → pending_inspection + 7日期限を設定済み）
- メール: src/lib/email/send-order-email.ts
- 完了ページ: src/app/[locale]/checkout/complete/page.tsx（inspection用のInstagram DMセクション実装済み）

### 注意事項
- Cloudflare D1はトランザクション未対応。db.batch()で代替
- APIルートにexport const runtime = "edge"を指定しないこと
- auth-v2のimportは静的importを使うこと
- Stripe SDKはFetchHttpClientを使用すること
- CRON_SECRETを.env.localに設定すること

### 参照すべきファイル
- 仕様書: specs/20260331_animehubs_v2_spec.md（セクション3: 実物確認ルート詳細）
- 実装ガイド: specs/20260402_implementation_guide.md（Phase 4: Step 4-1〜4-4）
- CLAUDE.md
