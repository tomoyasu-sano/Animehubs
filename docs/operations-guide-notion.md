# AnimeHubs 運用ガイド

---

## 1. メール通知マトリックス

| タイミング | 購入者に届くメール | 管理者に届くメール |
|-----------|-------------------|-------------------|
| 予約時（Inspection） | Reservation Confirmed（View Order リンク付き） | [AnimeHubs] New Reservation: AH-XXXX → **Action: Instagram DM で対面手配** |
| 決済完了（Inspection Pay Now） | Order Confirmation | [AnimeHubs] Payment Received (Inspection): AH-XXXX → **Action: 対面で手渡し、配送不要** |
| 決済完了（Delivery） | Order Confirmation | [AnimeHubs] New Order (Delivery): AH-XXXX → **Action: 配送が必要** |
| 予約キャンセル（期限切れ / 管理者操作） | Reservation Cancelled | — |
| 有料注文キャンセル（返金時） | Order Cancelled（返金情報付き） | — |

### メール送信タイミング

> ℹ️ **Inspection フロー**
>
> 顧客 → Reserve → ✉️ 顧客: Reservation Confirmed / ✉️ 管理者: New Reservation
> 顧客 → Pay Now → ✉️ 顧客: Order Confirmation / ✉️ 管理者: Payment Received

> ℹ️ **Delivery フロー**
>
> 顧客 → チェックアウト＆決済 → ✉️ 顧客: Order Confirmation / ✉️ 管理者: New Order

> ℹ️ **キャンセル**
>
> 期限切れ or 管理者操作 → ✉️ 顧客: Reservation Cancelled
> 返金時 → ✉️ 顧客: Order Cancelled

---

## 2. 注文ステータス遷移図

### Delivery フロー

```
pending_payment
  │
  ├──(Stripe決済成功)──→ paid
  │                        │
  │                        ├──(管理者が発送)──→ shipped ──→ completed
  │                        │
  │                        └──(管理者がRefund)──→ cancelled（Stripe返金）
  │
  └──(決済失敗)──→ payment_failed
```

### Inspection フロー

```
reserved
  │
  ├──(対面後にPay Now)──→ paid ──(管理者がMark Completed)──→ completed
  │
  └──(期限切れ自動 or 管理者Cancel)──→ cancelled
```

---

## 3. 購入フロー（顧客視点）

### Delivery

1. カートに追加 → チェックアウト → 住所入力 → Stripe 決済 → 完了メール → 配送待ち

### Inspection

1. カートに追加 → チェックアウト → 「Reserve for Inspection」 → 注文詳細ページ
2. Instagram DM で対面日程を調整
3. 対面で商品確認 → 満足なら「Pay Now」→ Stripe 決済 → その場で手渡し
4. 不満なら → 管理者がキャンセル → 在庫が戻る

---

## 4. 管理画面の操作ガイド（/admin/orders）

| ステータス | 表示されるボタン | 押した時の影響 |
|-----------|----------------|---------------|
| reserved | Cancel Reservation | ステータス → cancelled、在庫仮押さえ解除、顧客にキャンセルメール |
| paid (delivery) | Mark Completed / Refund | 完了処理 or Stripe 返金 → cancelled |
| paid (inspection) | Mark Completed | 完了処理（返金ボタンなし。対面販売のため返金義務なし） |

---

## 5. 自動処理（Cron）

> ⚙️ **毎時実行**: 予約から 7 日超過した reserved 注文を自動キャンセル
>
> - reserved_stock 解放、顧客にキャンセルメール送信
> - Stripe 返金なし（予約時点では決済していないため）

---

## 6. 在庫管理ロジック

| アクション | stock | reserved_stock |
|-----------|-------|---------------|
| 予約（Reserve） | 変化なし | +N |
| 決済完了（Pay Now / Delivery） | -N | -N |
| 予約キャンセル（期限切れ / 管理者） | 変化なし | -N |
| 有料注文返金（Delivery） | +N | 変化なし |

> ℹ️ **実質在庫 = stock - reserved_stock**
> カート画面や商品ページではこの値が「購入可能数」として表示される。

---

## 7. 制限・ルール

| ルール | 値 | 備考 |
|--------|-----|------|
| 最大予約数 | 3 件/ユーザー | 超過時はエラー表示 |
| 予約有効期限 | 7 日 | 超過で自動キャンセル |
| Inspection paid 後の返金 | なし | 対面販売 = スウェーデン距離販売法の対象外 |
| Stripe Checkout Session | 30 分で期限切れ | 期限切れ後も再度 Pay Now 可能 |
