# 決済戦略 :
実施したができなかった！！！スウェーデンでアカウント作ってもswishの支払い方法が表示されなかった！

作成日: 2026-04-04

---

## 現状

- Stripe Checkout で決済処理
- カード決済に対応

---

## Swish対応方針

### 結論: Stripe経由でSwish追加（ビジネスアカウント不要）

Stripeは2023年からスウェーデンでSwishを決済手段としてサポートしている。
Stripe Checkoutに `swish` を payment method として追加するだけで対応可能。

### メリット

- **管理一元化**: Stripe管理画面だけで完結。二重管理にならない
- **維持費ゼロ**: Swishビジネスアカウントの月額固定費が不要
- **実装が軽い**: Checkoutの設定変更のみ

### デメリット

- Stripeの手数料が上乗せされるため、直接Swish契約より1件あたりのコストは高い

### 将来の移行判断

売上が月数十万SEK（目安: 月200件以上の決済）を超えてきたら、Swishビジネスアカウント直接契約への切り替えを検討する。その場合もStripeと併用し、カード決済はStripe、SwishはSwish直接という構成にできる。

### 実装時のタスク

1. Stripe DashboardでSwishを有効化
2. Checkout Sessionの `payment_method_types` に `swish` を追加
3. Swish特有のフロー（QRコード表示→アプリ承認）のUX確認
4. テスト決済で動作検証
