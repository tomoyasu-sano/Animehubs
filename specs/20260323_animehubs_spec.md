# 仕様書: AnimeHubs - 対面受け渡し型アニメフィギュア予約システム

## 概要

Uppsala市のアニメフィギュア輸入販売ビジネス向けの予約Webアプリ。ユーザーは商品を閲覧・カートに追加し、受け渡し場所・時間帯を選んで予約を確定する。オンライン決済・ユーザー登録なしのシンプル設計。英語/スウェーデン語の2言語対応。管理者は2名で、商品管理・予約管理・売上確認を行う。

## 要件

### 機能要件
- 商品一覧・詳細表示（画像ギャラリー付き）
- カート機能（セッションベース、ローカルストレージ）
- 予約フロー（名前・メール入力、場所・時間選択、確認メール送信）
- 管理画面（商品CRUD、予約管理、売上集計）
- 検索・カテゴリフィルタリング
- お気に入り（ローカルストレージ）
- 多言語対応（en/sv）
- SEO対応（メタタグ、OGP）

### 非機能要件
- レスポンシブ（モバイルファースト）
- ページ読み込み: LCP < 2.5s
- CLS < 0.1
- Lighthouse Performance > 90
- アクセシビリティ: WCAG 2.1 AA準拠を目指す

## アーキテクチャ

### ディレクトリ構造
```
src/
  app/
    [locale]/                    # next-intl のロケールルーティング
      layout.tsx                 # ルートレイアウト（ヘッダー/フッター）
      page.tsx                   # トップページ（ヒーロー + 新着商品）
      products/
        page.tsx                 # 商品一覧
        [id]/
          page.tsx               # 商品詳細
      cart/
        page.tsx                 # カートページ
      checkout/
        page.tsx                 # 予約（チェックアウト）
        confirm/
          page.tsx               # 予約確認完了
    admin/
      layout.tsx                 # 管理画面レイアウト
      login/
        page.tsx                 # ログイン
      page.tsx                   # ダッシュボード
      products/
        page.tsx                 # 商品管理一覧
        new/
          page.tsx               # 商品新規追加
        [id]/
          edit/
            page.tsx             # 商品編集
      reservations/
        page.tsx                 # 予約一覧
      sales/
        page.tsx                 # 売上集計
    api/
      products/
        route.ts                 # GET: 商品一覧（検索・フィルタ対応）
        [id]/
          route.ts               # GET: 商品詳細、PUT: 更新、DELETE: 削除
      reservations/
        route.ts                 # POST: 予約作成、GET: 予約一覧（admin用）
        [id]/
          route.ts               # PUT: ステータス更新
      admin/
        auth/
          route.ts               # POST: ログイン
        products/
          route.ts               # POST: 商品作成（画像アップロード含む）
      upload/
        route.ts                 # POST: 画像アップロード
  components/
    layout/
      Header.tsx                 # ヘッダー（ナビ、カートアイコン、言語切替）
      Footer.tsx                 # フッター（Instagram、連絡先）
    products/
      ProductCard.tsx            # 商品カード
      ProductGrid.tsx            # 商品グリッド
      ProductGallery.tsx         # 画像ギャラリー（サムネイル付き）
      ProductSearch.tsx          # 検索バー
      CategoryFilter.tsx         # カテゴリフィルタ
    cart/
      CartSidebar.tsx            # スライドインカートパネル
      CartItem.tsx               # カート内アイテム
      CartSummary.tsx            # カート合計
    checkout/
      CheckoutForm.tsx           # 予約フォーム
      LocationPicker.tsx         # 受け渡し場所選択
      TimeSlotPicker.tsx         # 時間帯選択
    favorites/
      FavoriteButton.tsx         # お気に入りボタン
    ui/                          # shadcn/ui コンポーネント
  lib/
    db/
      schema.ts                  # SQLite スキーマ定義（Drizzle ORM）
      index.ts                   # DB接続
      seed.ts                    # シードデータ
      migrations/                # マイグレーションファイル
    email/
      send-confirmation.ts       # 予約確認メール送信
    auth.ts                      # 管理者認証ヘルパー
    constants.ts                 # 定数（場所、時間帯等）
    utils.ts                     # ユーティリティ
  hooks/
    useCart.ts                   # カート状態管理
    useFavorites.ts              # お気に入り管理
  i18n/
    request.ts                   # next-intl 設定
    routing.ts                   # ロケールルーティング設定
  messages/
    en.json                      # 英語メッセージ
    sv.json                      # スウェーデン語メッセージ
  middleware.ts                  # next-intl ミドルウェア
public/
  images/                        # 商品画像保存先
  placeholder/                   # プレースホルダー画像
```

### データベース設計（SQLite + Drizzle ORM）

#### products テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| name_en | TEXT | 商品名（英語） |
| name_sv | TEXT | 商品名（スウェーデン語） |
| description_en | TEXT | 説明（英語） |
| description_sv | TEXT | 説明（スウェーデン語） |
| price | INTEGER | 価格（SEK、オーレ単位で保存: 1 SEK = 100 ore） |
| stock | INTEGER | 在庫数 |
| category | TEXT | カテゴリ |
| condition | TEXT | コンディション（new/like_new/good/fair） |
| images | TEXT | 画像パスJSON配列（最大5枚） |
| featured | INTEGER | トップページ表示フラグ（0/1） |
| created_at | TEXT | 作成日時（ISO 8601） |
| updated_at | TEXT | 更新日時（ISO 8601） |

#### reservations テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| customer_name | TEXT | 顧客名 |
| customer_email | TEXT | 顧客メールアドレス |
| location | TEXT | 受け渡し場所 |
| time_slot | TEXT | 時間帯 |
| status | TEXT | ステータス（pending/confirmed/completed/cancelled） |
| total_amount | INTEGER | 合計金額（オーレ単位） |
| items | TEXT | 予約商品JSON（商品ID、数量、価格のスナップショット） |
| notes | TEXT | 備考 |
| created_at | TEXT | 作成日時 |
| updated_at | TEXT | 更新日時 |

#### admin_users テーブル
| カラム | 型 | 説明 |
|--------|------|------|
| id | TEXT (UUID) | 主キー |
| username | TEXT | ユーザー名（一意） |
| password_hash | TEXT | パスワードハッシュ（bcrypt） |
| created_at | TEXT | 作成日時 |

### 認証設計

管理画面の認証はシンプルなセッションベース認証:
- bcrypt でパスワードをハッシュ化して保存
- ログイン成功時に HTTP-only cookie でセッショントークン（JWT）を発行
- 管理画面の全ルートでミドルウェアがトークンを検証
- セッション有効期限: 24時間

### 予約フロー詳細

```
1. ユーザーが商品をカートに追加（ローカルストレージ）
2. カートページで内容確認
3. チェックアウトページへ遷移
4. 必須入力:
   - 名前（バリデーション: 2文字以上）
   - メールアドレス（バリデーション: メール形式）
   - 受け渡し場所（3箇所から選択）
   - 時間帯（3つから選択）
   - （オプション）Instagram でやり取りを選択 → 場所・時間帯の入力スキップ可
5. 予約確定
   - 在庫確認（サーバーサイド）
   - 在庫不足時はエラー表示
   - 在庫OK → 予約レコード作成 + 在庫減算
   - 確認メール送信（Resend API）
6. 確認完了ページ表示
   - 予約番号
   - 予約内容サマリー
   - 「Instagram で連絡する」リンク
```

### 画像管理

- アップロード先: `public/images/products/` (ローカルファイルシステム)
- 最大5枚/商品
- 受付形式: JPEG, PNG, WebP
- 最大サイズ: 5MB/枚
- リサイズ: アップロード時に最大幅1200pxにリサイズ（sharp使用）
- サムネイル: 400px幅のサムネイルも生成

### メール送信

Resend APIを使用した予約確認メール:
- 送信タイミング: 予約確定時のみ
- 送信先: 顧客のメールアドレス
- 内容:
  - 予約番号
  - 商品一覧と合計金額
  - 受け渡し場所と時間帯
  - 連絡先情報（Instagram）
- テンプレート: React Email を使用

### 多言語対応

next-intl を使用:
- デフォルトロケール: en
- 対応ロケール: en, sv
- URL構造: `/en/products`, `/sv/products`
- 商品データ: DB に name_en/name_sv のように言語別カラムを持つ
- UIテキスト: messages/en.json, messages/sv.json で管理

### 定数設計（後から変更可能）

```typescript
// lib/constants.ts
export const PICKUP_LOCATIONS = [
  { id: 'central-station', name_en: 'Uppsala Central Station', name_sv: 'Uppsala Centralstation' },
  { id: 'stora-torget', name_en: 'Stora Torget', name_sv: 'Stora Torget' },
  { id: 'forumgallerian', name_en: 'Forumgallerian', name_sv: 'Forumgallerian' },
] as const;

export const TIME_SLOTS = [
  { id: 'weekday-evening', name_en: 'Weekday Evening (17:00-19:00)', name_sv: 'Vardag kväll (17:00-19:00)' },
  { id: 'weekend-morning', name_en: 'Weekend Morning (10:00-12:00)', name_sv: 'Helg förmiddag (10:00-12:00)' },
  { id: 'weekend-afternoon', name_en: 'Weekend Afternoon (13:00-16:00)', name_sv: 'Helg eftermiddag (13:00-16:00)' },
] as const;

export const CATEGORIES = [
  'figures', 'scale-figures', 'nendoroid', 'figma',
  'prize-figures', 'garage-kits', 'other'
] as const;

export const CONDITIONS = [
  'new', 'like_new', 'good', 'fair'
] as const;
```

## 実装ステップ（推奨順序）

### 段階1: 基盤構築
1. **プロジェクト初期化** — Next.js 15 + TypeScript + Tailwind CSS v4 セットアップ
2. **DB セットアップ** — SQLite + Drizzle ORM のスキーマ定義・マイグレーション
3. **多言語基盤** — next-intl の設定、ルーティング、メッセージファイル
4. **共通レイアウト** — ヘッダー・フッター・基本構造

### 段階2: コア機能（商品表示）
5. **商品API** — CRUD APIルート
6. **商品一覧ページ** — カードグリッド、検索、フィルタ
7. **商品詳細ページ** — 画像ギャラリー、商品情報

### 段階3: カート・予約
8. **カート機能** — ローカルストレージベース、サイドパネル
9. **予約フロー** — チェックアウトフォーム、在庫確認、予約作成
10. **メール送信** — Resend API統合、React Emailテンプレート

### 段階4: 管理画面
11. **管理者認証** — ログイン、セッション管理
12. **商品管理** — CRUD画面、画像アップロード
13. **予約管理** — 予約一覧、ステータス更新
14. **売上集計** — 集計ダッシュボード

### 段階5: 仕上げ
15. **お気に入り機能** — ローカルストレージベース
16. **SEO対応** — メタタグ、OGP、サイトマップ
17. **レスポンシブ調整** — モバイル最適化
18. **パフォーマンス最適化** — 画像最適化、ローディングUI

## テスト戦略

### 単体テスト
- DB操作関数（商品CRUD、予約作成、在庫管理）
- バリデーション関数（フォーム入力）
- ユーティリティ関数（価格フォーマット、日付処理）
- 認証ヘルパー（トークン生成・検証）

### 結合テスト
- API ルートのリクエスト/レスポンス
- 予約フロー全体（在庫確認→予約作成→在庫減算）
- 管理画面の商品CRUD操作

### E2Eテスト
- 商品閲覧 → カート追加 → 予約完了フロー
- 管理画面ログイン → 商品作成 → 公開確認
- 言語切替がUI全体に反映されること
- レスポンシブ表示（モバイル/デスクトップ）

## リスクと対策

- **リスク**: 在庫の同時予約による競合
  - 対策: DB トランザクションで在庫確認・減算をアトミックに実行。SQLiteの場合WALモードで並行読み取りを確保
- **リスク**: Resend APIの障害でメール未送信
  - 対策: メール送信失敗を記録し、管理画面から再送可能にする。予約自体は成功として扱う
- **リスク**: 画像アップロードのファイルサイズ超過
  - 対策: クライアント側とサーバー側の両方でサイズチェック。5MB上限
- **リスク**: 管理者パスワードの漏洩
  - 対策: bcrypt ハッシュ化、HTTP-only cookie、CSRF対策

## 成功基準
- [ ] 商品を閲覧し、カートに追加し、予約を完了できる
- [ ] 予約確認メールが送信される
- [ ] 管理者が商品をCRUDできる
- [ ] 管理者が予約ステータスを更新できる
- [ ] 英語/スウェーデン語の切替が正しく動作する
- [ ] モバイルで快適に操作できる
- [ ] Lighthouse Performance > 90
- [ ] 全テスト通過、カバレッジ80%以上

## 人間が判断すべき項目
- [ ] 商品カテゴリの分類は適切か（figures, scale-figures, nendoroid, figma, prize-figures, garage-kits, other）
- [ ] コンディションの選択肢は適切か（new, like_new, good, fair）
- [ ] Instagram アカウントのリンク先URL
- [ ] Resend の送信元メールアドレス
- [ ] 管理者2名のユーザー名（シードデータ用）
- [ ] ロゴ画像・ヒーロー画像の素材
