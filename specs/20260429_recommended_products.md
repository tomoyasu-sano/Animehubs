# 仕様書: おすすめ商品機能

作成日: 2026-04-29
更新日: 2026-04-29（レビュー指摘 CRITICAL:1件 + HIGH:3件 + MEDIUM:6件 + LOW:4件 修正）
ステータス: **ドラフト**

---

## 1. 概要

### 背景・目的

商品詳細ページ（`/products/[id]`）では、閲覧中の商品情報のみが表示され、他の商品への導線がない。ユーザーが興味を持ちそうな商品を提案することで、回遊率と購買率を向上させたい。

現状の商品数は少量だが、今後継続的に増加する予定。ロジックは段階的に拡張できる設計とする。

### ゴール

- 商品詳細ページの下部に関連商品を表示し、ユーザーの回遊を促進する
- 既存コンポーネント（`ProductCard`）を再利用し、一貫したUIを提供する

### スコープ

| 含む | 含まない（将来検討） |
|------|-------------------|
| 同カテゴリ優先のルールベースおすすめ | ユーザー閲覧履歴ベースのパーソナライズ |
| 在庫あり商品の優先表示 | 作品名・キャラクター名タグによるマッチング |
| 英語・スウェーデン語対応 | 「一緒に買われた商品」（購入履歴ベース） |
| モバイル・デスクトップ対応レイアウト | A/Bテスト |

---

## 2. 用語定義

| 用語 | 定義 |
|------|------|
| 閲覧中の商品 | ユーザーが現在開いている商品詳細ページの商品 |
| おすすめ商品 | おすすめロジックにより選出された、閲覧中の商品以外の商品群 |
| 在庫あり | `stock - reservedStock > 0` の状態 |

---

## 3. 機能要件

### 3.1 おすすめロジック

閲覧中の商品を**必ず除外**した上で、以下の優先順位で最大4件を選出する。

#### Phase 1: 同カテゴリから選出

1. 閲覧中の商品と同じ `category` の商品を取得
2. **在庫あり**を優先（在庫あり → 在庫なしの順）
3. 同じ在庫状況内では**新着順**（`createdAt DESC`）

#### Phase 2: 不足分を他カテゴリから補充

Phase 1 で4件に満たない場合:

1. 他カテゴリの商品を取得
2. **在庫あり**を優先
3. 同じ在庫状況内では**人気順**（`likesCount DESC`）、同数なら新着順

#### 将来の拡張ポイント

商品数が増加した場合、以下の拡張を段階的に検討する。ロジックをクエリ関数に集約しておくことで、呼び出し側の変更なしに切り替え可能とする。

| 段階 | トリガー（目安） | 拡張内容 |
|------|----------------|---------|
| Phase A | 商品数 50+ | 同カテゴリ内で価格帯（±30%）が近い商品を優先 |
| Phase B | タグ機能追加時 | 作品名・キャラクター名タグでのマッチングを最優先に |
| Phase C | 購入データ蓄積時 | 「この商品を買った人はこれも買っています」ロジック |

### 3.2 表示仕様

#### 表示位置

商品詳細ページの2カラムグリッド（`md:grid-cols-2`）の**外側**、既存の `max-w-5xl` コンテナ**内側**に全幅で配置する。具体的には `</div><!-- grid終了 -->` の後、`</div><!-- max-w-5xl終了 -->` の前。

#### 表示条件

- おすすめ商品が **1件以上**ある場合のみセクションを表示
- 0件の場合はセクションごと非表示（空のタイトルを出さない）

#### 表示件数・レイアウト

| 画面サイズ | カラム数 | 最大表示件数 |
|-----------|---------|------------|
| モバイル（< 640px） | 2列 | 4件 |
| タブレット（640px〜1023px） | 3列 | 4件 |
| デスクトップ（≥ 1024px） | 4列 | 4件 |

#### セクションUI

- セクションタイトル: 上部に表示（`text-lg font-semibold`、既存の Description 見出しと同等）
- 商品カード: 既存の `ProductCard` コンポーネントを再利用
- セクション区切り: 上部に `border-t border-border pt-12 mt-12` で本体コンテンツと視覚的に分離
- ローディング: `Suspense` で囲み、スケルトン UI（カード形状の `animate-pulse` プレースホルダー × 4）を fallback に表示

### 3.3 i18n 対応

`src/messages/en.json` と `src/messages/sv.json` に以下のキーを追加する。

| キー | EN | SV |
|------|----|----|
| `products.recommendedTitle` | You might also like | Du kanske också gillar |

---

## 4. 技術設計

### 4.1 新規クエリ関数

`src/lib/db/queries.ts` に追加:

```typescript
async function getRecommendedProducts(
  excludeId: string,
  category: string,
  limit?: number  // デフォルト 4、1〜20 にクランプ
): Promise<Product[]>
```

**入力バリデーション:**

- `excludeId`: 空文字・未定義の場合は空配列を返却（除外対象なしでクエリしない）
- `category`: `CATEGORIES` 定数に含まれない値の場合、Phase 1 をスキップし Phase 2 のみ実行
- `limit`: `undefined` → 4、範囲外 → `Math.max(1, Math.min(20, limit))` でクランプ

**処理フロー:**

1. DB接続を1回取得（`getDb()` を最初に1回のみ呼ぶ）
2. 同カテゴリの商品を取得（`excludeId` を除外、在庫優先 → 新着順）
3. 件数が `limit` 未満の場合、他カテゴリから不足分を追加取得（在庫優先 → 人気順 → 新着順）
4. 結合して `limit` 件を返却

**ソートのSQL表現:**

```sql
-- Phase 1（同カテゴリ）: 在庫優先 → 新着順
ORDER BY
  CASE WHEN (stock - reserved_stock) > 0 THEN 0 ELSE 1 END ASC,
  created_at DESC

-- Phase 2（他カテゴリ補充）: 在庫優先 → 人気順 → 新着順
ORDER BY
  CASE WHEN (stock - reserved_stock) > 0 THEN 0 ELSE 1 END ASC,
  likes_count DESC,
  created_at DESC
```

**パフォーマンス備考:** Phase 1 + Phase 2 で最大2回クエリを発行する。Phase 1 で `limit` 件取得できた場合は Phase 2 は実行しない。現在の商品規模では問題ないが、将来的に1クエリ（UNION + サブクエリ）への統合を検討する。

### 4.2 コンポーネント構成（Server/Client 分離）

`ProductCard` は `"use client"` コンポーネントであり、`isFavorite` / `onToggleFavorite` が必須 props。この制約に対し、既存の `ProductGrid`（Client Component）をラッパーとして再利用する。

#### 構成図

```
[page.tsx] (RSC)
  └─ <Suspense fallback={<RecommendedSkeleton />}>
       └─ <RecommendedProducts> (RSC) ← DB からデータ取得
            └─ <RecommendedProductsGrid> (Client) ← ProductGrid と同様、useFavorites + ProductCard 描画
```

#### `RecommendedProducts`（Server Component）

`src/components/products/RecommendedProducts.tsx`

- **責務**: `getRecommendedProducts()` でデータ取得 → 0件なら `null` 返却 → 1件以上なら Client ラッパーに `products` を渡す
- **Props**:

```typescript
interface RecommendedProductsProps {
  productId: string;
  category: string;
}
```

#### `RecommendedProductsGrid`（Client Component）

`src/components/products/RecommendedProductsGrid.tsx`

- **責務**: `useFavorites` フックで状態管理、`ProductCard` をレンダリング
- **Props**:

```typescript
interface RecommendedProductsGridProps {
  products: Product[];
}
```

- グリッドクラス: `grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4`

### 4.3 商品詳細ページへの組み込み

`src/app/[locale]/products/[id]/page.tsx` の2カラムグリッド（`md:grid-cols-2`）の**下**、`max-w-5xl` コンテナの**中**に配置:

```tsx
<div className="mx-auto max-w-5xl px-6 py-8 md:py-16 lg:px-8 lg:py-24">
  {/* 既存の2カラムグリッド */}
  <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
    ...
  </div>

  {/* おすすめセクション（追加） */}
  <Suspense fallback={<RecommendedSkeleton />}>
    <RecommendedProducts productId={id} category={product.category} />
  </Suspense>
</div>
```

### 4.4 ページ遷移時の挙動

おすすめ商品をクリックして別の商品詳細ページに遷移した際、新しい商品に基づくおすすめが表示される必要がある。

- 商品詳細ページは動的ページ（`[id]` パラメータ依存）のため、Next.js App Router はパラメータ変更時に RSC を再実行する
- `RecommendedProducts` は RSC であり、遷移先の `productId` / `category` で再クエリされる
- 追加の `revalidate` / `dynamic` 設定は不要（デフォルト動作で正しく動く）

### 4.5 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/db/queries.ts` | `getRecommendedProducts()` 関数を追加 |
| `src/components/products/RecommendedProducts.tsx` | 新規作成（Server Component） |
| `src/components/products/RecommendedProductsGrid.tsx` | 新規作成（Client Component） |
| `src/components/products/RecommendedSkeleton.tsx` | 新規作成（スケルトン UI） |
| `src/app/[locale]/products/[id]/page.tsx` | `Suspense` + `RecommendedProducts` を配置 |
| `src/messages/en.json` | `products.recommendedTitle` を追加 |
| `src/messages/sv.json` | `products.recommendedTitle` を追加 |

---

## 5. テスト方針

### 5.1 ユニットテスト

| テスト対象 | ケース |
|-----------|--------|
| `getRecommendedProducts` | 同カテゴリ商品が4件以上ある場合、同カテゴリから4件返る |
| | 同カテゴリ商品が2件の場合、他カテゴリから2件補充される |
| | 同カテゴリ商品が3件 + 他カテゴリ1件の混合ケース（境界値） |
| | 同カテゴリ商品が0件の場合、他カテゴリから4件返る |
| | 同カテゴリに閲覧中の商品のみ存在する場合、他カテゴリから補充される |
| | 閲覧中の商品自身が結果に含まれない |
| | 在庫あり商品が在庫なし商品より先に表示される |
| | Phase 2 で `likesCount` 同数の商品は新着順でソートされる |
| | 商品が全く存在しない場合、空配列が返る |
| | `excludeId` が空文字の場合、空配列が返る |
| | `limit` が範囲外の場合、クランプされる |

### 5.2 UIテスト

| テスト対象 | ケース |
|-----------|--------|
| `RecommendedProducts` | おすすめ0件の場合、セクションが非表示 |
| | おすすめ1〜4件の場合、正しい件数のカードが表示される |
| | セクションタイトルが正しいロケールで表示される |
| | スケルトン UI がローディング中に表示される |

### 5.3 E2Eテスト

| テスト対象 | ケース |
|-----------|--------|
| 回遊フロー | 商品詳細ページでおすすめセクションが表示される |
| | おすすめ商品をクリック → 遷移先で新しいおすすめが表示される（古い結果が残らない） |

---

## 6. リスク・考慮事項

| リスク | 影響 | 対策 |
|--------|------|------|
| 商品数が極めて少ない（1〜2件） | おすすめが0件になりセクション非表示 | 0件時は非表示で許容。商品追加で自然に解消 |
| 全商品が同カテゴリ | Phase 2（他カテゴリ補充）が機能しない | Phase 1 のみで問題なし。同カテゴリ内で4件選出 |
| 将来のタグ機能追加時 | ロジック変更が必要 | `getRecommendedProducts` 内部のみ変更すれば対応可能な設計 |
| 在庫切れ商品の表示 | 購入できない商品がおすすめに出る | 在庫ありを優先しつつ、在庫切れも表示する（商品数が少ない段階では回遊導線として有効）。商品数が増えた段階で在庫切れ除外への変更を検討 |
| `createdAt` が text 型 | SQLite のテキストソートが前提 | ISO 8601 フォーマット（`YYYY-MM-DDTHH:MM:SSZ`）で格納されているため、テキスト順序でのソートが正しく機能する |
