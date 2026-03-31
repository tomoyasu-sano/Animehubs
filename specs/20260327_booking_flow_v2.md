# 仕様書: 予約フロー改修 v2 — Google Calendar連携 + Instagram DMフロー

作成日: 2026-03-27
対象ブランチ: feature/booking-flow-v2

---

## 概要

現在の予約フロー（固定3時間帯から選択）を廃止し、以下の2フローへ分岐させる。

- **フロー A**: 場所を選択 → Google Calendar の予約ページで日時を確定
- **フロー B**: Instagram DM で場所・時間を後から調整

---

## 背景・目的

- 固定時間帯（平日夕方 / 週末午前 / 週末午後）では販売者のスケジュール変動に対応できない
- Google Calendar の予約スケジュール機能を使うことで、販売者がカレンダー側で空き枠を管理できる
- Instagram DM 経由の予約は、SNSで既につながっているユーザーに対して柔軟な対応を可能にする

---

## フロー全体図

```
カートページ
    ↓ [チェックアウトへ進む]
チェックアウトページ
    ↓
名前・メールアドレス入力
    ↓
┌──────────────────────────────────────────────────┐
│           予約方法を選択してください              │
├─────────────────────┬────────────────────────────┤
│  A. 日時・場所を決める │  B. Instagramで調整する   │
└─────────────────────┴────────────────────────────┘
         ↓                           ↓
    [フロー A]                   [フロー B]
```

---

## フロー A：Google Calendar 予約

### ユーザー体験

1. チェックアウトページで「日時・場所を決める」を選択
2. 受け渡し場所を3箇所から選択
3. 「カレンダーで日時を選ぶ」ボタンをクリック
4. Google Calendar の予約ページへ遷移（別タブ）
5. Google Calendar 側で希望の日時を選択・確定（名前・メール入力）
6. AnimeHubs 側の予約フォームで「予約を確定する」ボタンをクリック
7. 予約確認メールを受信（場所の情報 + Googleカレンダー確認案内）

### 場所と Google Calendar URL の対応

各場所につき、販売者が Google Calendar で「予約スケジュール」を作成し、URLを環境変数に設定する。

| 場所 | 環境変数 |
|------|---------|
| Uppsala Central Station | `NEXT_PUBLIC_GCAL_URL_CENTRAL_STATION` |
| Stora Torget | `NEXT_PUBLIC_GCAL_URL_STORA_TORGET` |
| Forumgallerian | `NEXT_PUBLIC_GCAL_URL_FORUMGALLERIAN` |

URLが未設定の場合、該当の場所は選択不可として表示する。

### DB変更

- `time_slot` カラム: `NOT NULL` → `NULL` 許容（フローAでは値なし）
- `booking_flow` カラム追加: `TEXT NOT NULL DEFAULT 'calendar'`（`'calendar'` or `'instagram'`）
- `google_calendar_event_id` カラム追加: `TEXT NULL`（将来のWebhook連携用・現時点は未使用）

### 予約ステータス

```
pending_calendar → confirmed → completed
                             → cancelled
```

`pending_calendar` = Google Calendar での確定を待っている状態
管理者が Google Calendar 側の確認後、管理画面でステータスを `confirmed` に更新する。

### メール（フロー A）

送信タイミング: 予約確定時（Google Calendar 遷移前でも可）

メール内容:
- 予約番号
- 商品一覧・合計金額
- 選択した受け渡し場所
- 「Google Calendar で日時を確定してください」の案内リンク（場所のカレンダーURL）
- 注意書き: 「カレンダーでの予約が完了するまで受け渡し日時は確定しません」

---

## フロー B：Instagram DM 予約

### ユーザー体験

1. チェックアウトページで「Instagramで調整する」を選択
2. 名前・メールアドレスのみ入力（場所・時間の入力なし）
3. 「予約を確定する」ボタンをクリック
4. 予約確認メールを受信（Instagram DM 誘導リンク付き）
5. `@animehubs` に Instagram DM を送り、場所・時間を調整

### DB変更

- `location` カラム: `NOT NULL` → `NULL` 許容（フローBでは値なし）
- `time_slot` カラム: 上記と同様（NULL許容）

### 予約ステータス

```
pending_instagram → confirmed → completed
                              → cancelled
```

`pending_instagram` = Instagram DM での調整待ち状態

### メール（フロー B）

送信タイミング: 予約確定時

メール内容:
- 予約番号
- 商品一覧・合計金額
- 「次のステップ」として Instagram DM 案内
  - `@animehubs` への DM リンク（`NEXT_PUBLIC_INSTAGRAM_URL`）
  - DM で連絡する内容例: 「予約番号 XXXXXXXX で予約しました。場所と時間を相談させてください」
- 注意書き: 「DM でのやり取りが完了するまで受け渡し日時は確定しません」

---

## ステータス一覧（改修後）

| ステータス | 意味 | 遷移先 |
|-----------|------|--------|
| `pending_calendar` | カレンダー確定待ち | confirmed, cancelled |
| `pending_instagram` | Instagram DM 調整待ち | confirmed, cancelled |
| `confirmed` | 日時確定済み | completed, cancelled |
| `completed` | 受け渡し完了 | （最終状態） |
| `cancelled` | キャンセル | （最終状態） |

既存の `pending` ステータスは `pending_calendar` に統合する。
移行スクリプトで既存データの `pending` → `pending_calendar` に変換する。

---

## 変更ファイル一覧

### DB・スキーマ

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/db/schema.ts` | `booking_flow`, `google_calendar_event_id` カラム追加。`location`, `time_slot` を nullable化 |
| `src/lib/db/migrations/` | マイグレーションファイル追加 |

### バリデーション

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/validation.ts` | フロー別バリデーション（AはlocationのみOK / Bは不要） |
| `src/lib/constants.ts` | ステータス定数を更新、`GOOGLE_CAL_URLS` 定数追加 |

### API

| ファイル | 変更内容 |
|---------|---------|
| `src/app/api/reservations/route.ts` | `booking_flow` 対応、フロー別バリデーション適用 |
| `src/app/api/admin/reservations/[id]/route.ts` | 新ステータスへの遷移ルール更新 |

### UI コンポーネント

| ファイル | 変更内容 |
|---------|---------|
| `src/components/checkout/CheckoutForm.tsx` | フロー選択UI追加、A/B分岐ロジック |
| `src/components/checkout/LocationPicker.tsx` | カレンダーURL遷移ボタンをフロー A 時に表示 |
| `src/components/checkout/TimeSlotPicker.tsx` | フロー A では非表示（削除またはhide） |
| `src/components/checkout/FlowSelector.tsx` | 【新規】フロー選択UI（A or B） |

### メール

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/email/send-confirmation.ts` | フロー別メールテンプレート切り替え |
| `src/lib/email/templates/calendar-confirmation.tsx` | 【新規】フロー A 用メールテンプレート |
| `src/lib/email/templates/instagram-confirmation.tsx` | 【新規】フロー B 用メールテンプレート |

### 管理画面

| ファイル | 変更内容 |
|---------|---------|
| `src/app/admin/reservations/page.tsx` | 新ステータスの表示対応、フローA/B の識別表示 |

### 環境変数

`.env.example` に追加:
```
NEXT_PUBLIC_GCAL_URL_CENTRAL_STATION=
NEXT_PUBLIC_GCAL_URL_STORA_TORGET=
NEXT_PUBLIC_GCAL_URL_FORUMGALLERIAN=
```

### 多言語

`src/messages/en.json`, `src/messages/sv.json` に追加:
- フロー選択UIのテキスト
- フロー A 用: カレンダー誘導の説明文
- フロー B 用: Instagram DM 誘導の説明文
- 新ステータスラベル

---

## Google Calendar セットアップ手順（運用側）

1. Google アカウント（AnimeHubs 専用）を用意
2. Google Calendar → 「予約スケジュール」を場所ごとに作成
3. 各スケジュールの設定:
   - タイトル例: `AnimeHubs @ Uppsala Central Station`
   - 予約可能時間帯: 販売者が都度設定
   - 1回の予約時間: 15〜30分程度
4. 各スケジュールの共有URLを取得
5. `.env` の `NEXT_PUBLIC_GCAL_URL_*` に設定

---

## 未解決事項・将来検討

- Google Calendar Webhook 連携（予約確定時に AnimeHubs DB を自動更新）は v2 では対象外
- 場所が増えた場合の拡張（環境変数追加 + constants.ts の LOCATIONS 配列に追加）
- Instagram API 連携（DM 自動返信）は対象外

---

## Phase 分類

本改修は **追加仕様 change_1** として扱う。
phases/project-config.md の `追加仕様書の次番号（change_N）` を `2` に更新すること。
