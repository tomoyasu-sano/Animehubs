# Phase 1: 基盤構築 + 商品表示

## Phase概要
プロジェクトの初期セットアップ、DB設計、多言語基盤、共通レイアウト、商品API・一覧・詳細ページまでを実装する。このPhase完了後、ユーザーが商品を閲覧できる状態になる。

## 実装範囲

### 1. プロジェクト初期化
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui
- ESLint + Prettier
- Vitest セットアップ
- 環境変数テンプレート（.env.example）

### 2. DB セットアップ
- SQLite + Drizzle ORM（better-sqlite3）
- スキーマ定義（products, reservations, admin_users）
- マイグレーション
- シードデータ（サンプル商品5〜10件、管理者2名）

### 3. 多言語基盤
- next-intl 設定
- ミドルウェア（ロケールルーティング）
- メッセージファイル（en.json, sv.json）— 共通UI部分のみ
- [locale] ルーティング構造

### 4. 共通レイアウト
- Header コンポーネント（ロゴ、ナビ、カートアイコン、言語切替）
- Footer コンポーネント（Instagram、連絡先）
- ルートレイアウト（フォント: Inter）

### 5. 商品API
- GET /api/products — 商品一覧（検索、カテゴリフィルタ対応）
- GET /api/products/[id] — 商品詳細

### 6. 商品ページ
- トップページ（ヒーローセクション + 注目商品）
- 商品一覧ページ（ProductGrid, ProductCard, ProductSearch, CategoryFilter）
- 商品詳細ページ（ProductGallery, 商品情報表示）

### 7. 定数・ユーティリティ
- lib/constants.ts（場所、時間帯、カテゴリ、コンディション）
- lib/utils.ts（価格フォーマット等）

## 単体テスト（TDD）
- DB操作: 商品の作成、取得、一覧取得（フィルタ付き）
- ユーティリティ: 価格フォーマット（SEK）、スラッグ生成
- 定数: PICKUP_LOCATIONS, TIME_SLOTS の型チェック
- API: GET /api/products のレスポンス形式
- API: GET /api/products/[id] の正常系・404

## Phase完了時テスト
- **機能的E2E**: トップページ表示 → 商品一覧遷移 → 検索 → カテゴリフィルタ → 商品詳細表示
- **視覚的回帰**: トップページ、商品一覧、商品詳細の3画面
- **パフォーマンス**: トップページ、商品一覧ページ

## 人間テスト項目
- デザインの全体的な雰囲気が「モノトーン・ミニマル・コレクター向け」に合っているか
- 商品カードのホバーアニメーションが自然か
- 画像ギャラリーの操作感
- 言語切替のスムーズさ
- モバイルでのレイアウト崩れがないか

## 完了条件
- [ ] 全単体テスト PASS
- [ ] E2Eテスト PASS（商品閲覧フロー）
- [ ] 視覚的回帰テスト 異常なし
- [ ] Lighthouse スコア: Performance > 90
- [ ] 人間テスト完了
- [ ] コードレビュー PASS（CRITICAL/HIGH: 0件）
