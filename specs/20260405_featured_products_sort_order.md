# 仕様書: Featured商品の並び替え機能

作成日: 2026-04-05
更新日: 2026-04-05（レビュー指摘 CRITICAL:1件 + HIGH:5件 + MEDIUM:7件 + LOW:4件 修正）
ステータス: **ドラフト**

---

## 1. 概要

### 背景・目的

トップページの「Featured Products」セクションは、管理者が `featured` フラグをONにした商品を最大6件表示する。現在の表示順は `created_at DESC`（登録日の新しい順）固定で、管理者が意図的に並び順を制御する手段がない。

新商品のプロモーション、セール品の強調、季節商品の優先表示など、マーケティング上の理由で表示順を柔軟に変更したい。

### ゴール

- 管理者がFeatured商品の表示順をドラッグ&ドロップで自由に変更できる
- トップページに反映される表示順を管理者が完全にコントロールできる

### スコープ

| 含む | 含まない（将来検討） |
|------|-------------------|
| Featured商品の手動並び替えUI | カテゴリ別の並び替え |
| ドラッグ&ドロップ操作 | 商品一覧ページ（`/products`）の並び替え |
| 並び順の永続化（DB保存） | 時間帯別の自動切り替え |
| Featured追加時の自動末尾配置 | A/Bテスト対応 |
| Featured商品の上限20件 | 監査ログ（将来検討） |

---

## 2. 用語定義

| 用語 | 定義 |
|------|------|
| Featured商品 | `products.featured = 1` の商品。トップページに表示される。上限20件 |
| featured_order | Featured商品の表示順を制御する正の整数値（1始まり）。小さいほど先に表示。`featured = 0` の商品は常に 0 |
| 並び替えUI | 管理画面内のドラッグ&ドロップ操作で表示順を変更するインターフェース |

---

## 3. 機能要件

### 3.1 DBスキーマ変更

#### 3.1.1 カラム追加

`products` テーブルに `featured_order` カラムを追加する。

| カラム名 | 型 | NOT NULL | デフォルト | 説明 |
|---------|-----|---------|-----------|------|
| featured_order | INTEGER | YES | 0 | Featured商品の表示順（1始まり昇順。0 = 非Featured） |

**`featured_order` の値ルール**:
- `featured = 0` → 常に `featured_order = 0`
- `featured = 1` → `featured_order >= 1`（1始まりの連番）
- `featured = 1` かつ `featured_order = 0` は不正状態。3.5節の自動設定ロジックにより、このケースは発生しない

#### 3.1.2 マイグレーション

ファイル名: `0004_featured_order.sql`（既存: 0000〜0003）

```sql
-- 0004_featured_order.sql
ALTER TABLE products ADD COLUMN featured_order INTEGER NOT NULL DEFAULT 0;
```

#### 3.1.3 既存データの初期化

マイグレーション実行後、既存のFeatured商品に `featured_order` を設定する初期化処理が必要。

**方針**: D1（SQLite）は `ROW_NUMBER()` ウィンドウ関数をサポートするため、SQL単体で実行可能。ただし `UPDATE ... FROM` 構文はSQLiteでサポートされないため、アプリケーション側でのシード処理を併用する。

```typescript
// シードスクリプト（マイグレーション後に1回実行）
const featuredProducts = await db
  .select({ id: products.id })
  .from(products)
  .where(eq(products.featured, 1))
  .orderBy(asc(products.createdAt))
  .all();

for (let i = 0; i < featuredProducts.length; i++) {
  await db.update(products)
    .set({ featuredOrder: i + 1 })
    .where(eq(products.id, featuredProducts[i].id));
}
```

### 3.2 表示ロジック変更

#### 3.2.1 ソート順の変更

**対象関数**: `getProducts()` in `/src/lib/db/queries.ts`

| 条件 | 現在のソート | 変更後のソート |
|------|------------|--------------|
| `featured: true` | `created_at DESC` | `featured_order ASC, created_at DESC` |
| `featured: false` またはなし | `created_at DESC` | 変更なし |

- `featured_order` が同値の場合は `created_at DESC` でフォールバック（初期化済みのため通常は発生しない）
- Featured以外の商品取得には影響しない

#### 3.2.2 影響範囲

| 画面・機能 | 影響 |
|-----------|------|
| トップページ Featured Products | **あり** — ソート順が変わる |
| 商品一覧ページ `/products` | なし |
| ニュースレター New Arrivals | なし — `created_at` 基準のまま |
| 管理画面 商品一覧 | なし — 管理画面は既存のソートを維持 |
| API `GET /api/products?featured=true` | **あり** — ソート順が変わる |

### 3.3 管理画面: 並び替えUI

#### 3.3.1 画面構成

**URL**: `/admin/featured-order`

管理画面サイドバーに「Featured Order」メニューを追加する。

```
Dashboard
Products
Featured Order  ← 新規追加（アイコン: GripVertical from lucide-react）
Orders
Newsletter
Sales
```

#### 3.3.2 UIコンポーネント

```
┌─────────────────────────────────────────┐
│  Featured Products Order                │
│                                         │
│  ┌─ Drag handle ──────────────────────┐ │
│  │ ≡  1. [画像] 商品名A    ¥1,200    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ ≡  2. [画像] 商品名B    ¥980     │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ ≡  3. [画像] 商品名C    ¥2,500    │ │
│  └────────────────────────────────────┘ │
│  ...                                    │
│                                         │
│  [ Save Order ]  (ローディング中は無効化+スピナー) │
│                                         │
│  ※ トップページには上位6件が表示されます │
└─────────────────────────────────────────┘
```

#### 3.3.3 UI仕様詳細

| 項目 | 仕様 |
|------|------|
| 表示対象 | `featured = 1` の商品のみ |
| 初期表示順 | `featured_order ASC, created_at DESC` |
| 各行の表示内容 | ドラッグハンドル（≡）、連番、サムネイル（48x48）、商品名（EN）、価格 |
| 操作 | ドラッグ&ドロップで行を移動 |
| 保存 | 「Save Order」ボタンで一括保存。**全件送信必須**（後述 3.4.1） |
| 保存中状態 | ボタンを `disabled` にし、スピナーを表示。二重送信を防止 |
| 未保存状態 | 変更がある場合、ボタンをハイライト + 「Unsaved changes」表示 |
| ページ離脱警告 | 未保存の変更がある場合、`beforeunload` イベントで確認ダイアログを表示 |
| 保存成功 | トースト通知「Order saved successfully」 |
| 保存失敗 | トースト通知「Failed to save order. Please try again.」 |
| 空状態 | Featured商品が0件の場合「No featured products. Mark products as featured in the Products page.」 |

#### 3.3.4 ドラッグ&ドロップ ライブラリ

**選定**: `@dnd-kit/core` + `@dnd-kit/sortable`

| 候補 | 判断 | 理由 |
|------|------|------|
| @dnd-kit | **採用** | 軽量、React 18対応、アクセシビリティ対応、アクティブにメンテナンス |
| react-beautiful-dnd | 不採用 | メンテナンス終了（Atlassianがアーカイブ） |
| react-sortable-hoc | 不採用 | レガシー、HOCパターン |

**センサー設定**:

| センサー | 設定 | 目的 |
|---------|------|------|
| PointerSensor | `activationConstraint: { distance: 8 }` | 誤タップ防止（8px以上移動で開始） |
| TouchSensor | `activationConstraint: { delay: 200, tolerance: 5 }` | スクロールとの競合防止（200ms長押し + 5px許容） |
| KeyboardSensor | デフォルト（`sortableKeyboardCoordinates`） | アクセシビリティ対応 |

### 3.4 API

#### 3.4.1 PUT `/api/admin/featured-order`

Featured商品の表示順を一括更新する。**全件送信必須** — 現在 `featured = 1` の全商品を `items` に含める必要がある。

**リクエスト**:

```json
{
  "items": [
    { "id": "550e8400-e29b-41d4-a716-446655440000", "order": 1 },
    { "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "order": 2 },
    { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "order": 3 }
  ]
}
```

**認証**: `getAdminSession()` を使用。`null` の場合は `401: { error: "Unauthorized" }`。

**バリデーション**:

| ルール | エラー時の応答 |
|--------|--------------|
| `items` が配列であること | 400: `{ error: "Validation failed", details: ["items must be an array"] }` |
| `items` が空でないこと | 400: `{ error: "Validation failed", details: ["items must not be empty"] }` |
| `items.length <= 50` | 400: `{ error: "Validation failed", details: ["Too many items (max 50)"] }` |
| 各要素に `id`（文字列）と `order`（正の整数）があること | 400: `{ error: "Validation failed", details: ["Invalid item format at index N"] }` |
| `order` の値が 1 以上であること | 400: `{ error: "Validation failed", details: ["order must be a positive integer"] }` |
| `id` の重複がないこと | 400: `{ error: "Validation failed", details: ["Duplicate product IDs"] }` |
| `items` が現在の全Featured商品と一致すること（過不足なし） | 400: `{ error: "Validation failed", details: ["items must include all featured products exactly"] }` |

**成功レスポンス**: `200 { message: "Featured order updated successfully" }`

**レートリミット**: 既存の管理者APIと同等（現在は未実装のため、他のエンドポイントに合わせる）

#### 3.4.2 DB更新処理

Drizzle ORM 経由で D1 の `db.batch()` を使用して一括更新する。

```typescript
// 疑似コード
const now = new Date().toISOString();
const statements = items.map(({ id, order }) =>
  db.update(products)
    .set({ featuredOrder: order, updatedAt: now })
    .where(eq(products.id, id))
);
await db.batch(statements);
```

**注意**: Drizzle + D1 の `db.batch()` はトランザクション保証あり（D1のbatch APIは暗黙的にトランザクション内で実行される）。

### 3.5 自動設定ルール

`featured_order` の自動設定ロジックは **route.ts ハンドラ側** で実行する。`createProduct()` / `updateProduct()` 関数自体は渡された値をそのまま保存するだけとし、ビジネスロジックをハンドラに集約する。

#### 3.5.1 Featured ON時（0→1 変更）

**対象箇所**: `PUT /api/admin/products/[id]/route.ts` のハンドラ内

```typescript
// ハンドラ内の疑似コード
const currentProduct = await getProductById(id);
if (currentProduct.featured === 0 && body.featured === 1) {
  // 現在のFeatured商品の最大orderを取得
  const maxOrder = await db.select({ max: sql<number>`MAX(featured_order)` })
    .from(products)
    .where(eq(products.featured, 1));
  const newOrder = (maxOrder[0]?.max ?? 0) + 1;
  body.featuredOrder = newOrder;
}
```

**Featured上限チェック**: Featured ON時に既存のFeatured商品が20件以上の場合は `400: { error: "Validation failed", details: ["Maximum 20 featured products allowed"] }` を返す。

#### 3.5.2 Featured OFF時（1→0 変更）

**対象箇所**: `PUT /api/admin/products/[id]/route.ts` のハンドラ内

```typescript
if (currentProduct.featured === 1 && body.featured === 0) {
  body.featuredOrder = 0;
}
```

#### 3.5.3 新規商品作成時

**対象箇所**: `POST /api/admin/products/route.ts` のハンドラ内

`featured = 1` で作成した場合、3.5.1 と同様に末尾に配置。Featured上限チェックも同様に適用。

#### 3.5.4 商品削除時

`DELETE /api/admin/products/[id]` で商品が削除された場合、他のFeatured商品の `featured_order` は **変更しない**。欠番が発生するが、表示順は相対値で決まるため問題なし（4.2節参照）。並び替えUIの連番表示は `featured_order` の値ではなくリスト内のインデックスで生成する。

---

## 4. 非機能要件

### 4.1 パフォーマンス

| 項目 | 要件 |
|------|------|
| 並び替えAPI応答時間 | 500ms以内（Featured商品は最大20件） |
| トップページ表示への影響 | INDEXなしでも十分（Featured商品は少数のため） |

### 4.2 データ整合性

| シナリオ | 対応 |
|---------|------|
| 並び替え保存時にFeatured解除済み商品がある | 全件一致バリデーションで400エラー（3.4.1参照）。UIをリロードして再操作 |
| 2人の管理者が同時に並び替え | 後勝ち（last-write-wins）。楽観ロック不要（管理者1名運用のため） |
| featured_orderに欠番が発生 | 許容。表示順は相対値で決まるため問題なし。UIの連番はインデックスで生成 |
| `featured = 1` かつ `featured_order = 0` | 不正状態。3.5節の自動設定により発生しない。万一発生時はソート末尾に表示 |

### 4.3 アクセシビリティ

| 項目 | 対応 |
|------|------|
| キーボード操作 | @dnd-kitのキーボードセンサーを有効化（Space/Enter でピック、矢印で移動） |
| スクリーンリーダー | @dnd-kitのアナウンスメント機能を使用 |
| フォーカス管理 | ドラッグ完了後に移動先にフォーカスを戻す |

---

## 5. 技術設計

### 5.1 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/db/schema.ts` | `featuredOrder` カラム追加 |
| `src/lib/db/migrations/0004_featured_order.sql` | マイグレーションSQL |
| `src/lib/db/queries.ts` | `getProducts()` のソート条件変更（`featured: true` 時のみ） |
| `src/app/api/admin/featured-order/route.ts` | **新規** — 並び替えAPI（PUT） |
| `src/app/api/admin/products/route.ts` | POST ハンドラに `featured_order` 自動設定 + 上限チェック追加 |
| `src/app/api/admin/products/[id]/route.ts` | PUT ハンドラに featured 変更検知（0→1, 1→0）+ 自動設定/リセット追加 |
| `src/app/admin/featured-order/page.tsx` | **新規** — 管理画面ページ |
| `src/components/admin/FeaturedOrderList.tsx` | **新規** — ドラッグ&ドロップリストコンポーネント |
| `src/app/admin/AdminLayoutInner.tsx` | サイドバーに `GripVertical` アイコン付きメニュー追加 |
| `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 追加 |

### 5.2 依存パッケージ追加

```json
{
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.0.0"
}
```

**注意**: 実装時に npm で最新安定版を確認し、正確なバージョンを指定する。

### 5.3 Drizzleスキーマ変更

```typescript
// schema.ts への追加
export const products = sqliteTable("products", {
  // ... 既存カラム
  featuredOrder: integer("featured_order").notNull().default(0),
});
```

---

## 6. テスト計画

### 6.1 ユニットテスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| APIバリデーション | 不正リクエストの拒否（空配列、重複ID、非Featured商品、上限超過、部分送信） |
| 全件一致バリデーション | Featured商品との過不足検出が正しく動作すること |
| featured_order自動設定 | Featured ON時に末尾（MAX+1）に配置されること |
| featured_order自動リセット | Featured OFF時に0にリセットされること |
| Featured上限チェック | 21件目のFeatured ON が拒否されること |
| ソート順 | `featured_order ASC, created_at DESC` で正しくソートされること |

### 6.2 統合テスト

| テスト対象 | テスト内容 |
|-----------|-----------|
| 並び替えAPI → DB反映 | PUT後にDBの値が正しく更新されていること |
| 並び替え → トップページ | 並び替え後にトップページの表示順が反映されること |
| Featured ON/OFF連動 | チェックボックス操作で featured_order が正しく設定/リセットされること |
| 商品削除 → 欠番許容 | Featured商品削除後、残りの表示順が維持されること |

### 6.3 E2Eテスト

| シナリオ | 手順 |
|---------|------|
| 基本並び替え | 管理画面で3件の順序を変更 → Save → トップページで順序確認 |
| 空状態 | Featured商品0件 → 空状態メッセージが表示されること |
| 未保存離脱警告 | 並び替え変更後、ページ離脱時に確認ダイアログが表示されること |

### 6.4 手動テスト（人間実施）

| 項目 | 確認内容 |
|------|---------|
| ドラッグ操作の触感 | スムーズにドラッグできるか、視覚的フィードバックは十分か |
| モバイル対応 | タッチデバイスでドラッグ操作が可能か（スクロールと競合しないか） |
| 保存中のUI状態 | ローディング中にボタンが無効化されるか、二重送信されないか |
| 保存後の画面遷移 | トップページに戻って反映を確認 |

---

## 7. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| @dnd-kitのバージョン互換性 | ビルド失敗 | 実装前に最新安定版を確認、lockfile固定 |
| D1でのバッチ更新制限 | 大量更新時にエラー | Featured商品は上限20件のため問題なし |
| マイグレーション失敗 | 既存データに影響 | DEFAULT 0 でカラム追加のみ。既存レコードは影響なし |
| タッチ操作とスクロールの競合 | モバイルUX低下 | TouchSensorに `delay: 200ms` を設定して長押しで開始 |

---

## 8. 実装フェーズ

単一フェーズで実装（小規模機能のため分割不要）。

| ステップ | 内容 | 見積り |
|---------|------|--------|
| 1 | DBスキーマ変更 + マイグレーション (`0004`) | 小 |
| 2 | 既存データの初期化シード処理 | 小 |
| 3 | `getProducts()` ソート変更 | 小 |
| 4 | 並び替えAPI実装（全件一致バリデーション含む） | 中 |
| 5 | 商品作成/更新APIの自動設定ロジック追加（route.tsハンドラ内） | 小 |
| 6 | 管理画面UI（ドラッグ&ドロップ + センサー設定 + 離脱警告） | 中 |
| 7 | テスト | 中 |
