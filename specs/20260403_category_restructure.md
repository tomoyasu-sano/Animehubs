# カテゴリ・コンディション再構成 仕様書

**作成日:** 2026-04-03
**ステータス:** ドラフト
**改訂:** v2（レビュー指摘反映）

---

## 1. 背景・目的

### 現状の問題

現在のカテゴリ（7種）は一般的なアニメフィギュア EC を想定した分類だが、実際に手元にある商品と合っていない。

| 現カテゴリ | 問題 |
|-----------|------|
| Figures | Scale Figures との区別が不明確 |
| Scale Figures | Figures と重複。売る側も区別できない |
| Nendoroid | 手元にない。将来仕入れる可能性はある |
| Figma | 手元にない。グッスマの可動フィギュアブランド |
| Prize Figures | 手元にない。ゲーセン景品フィギュア |
| Garage Kits | 手元にない。未塗装・未組立キット |
| Other | 曖昧すぎる |

### 実際に手元にある商品

- **フィギュア** — 大小さまざま、箱あり/箱なし
- **キーホルダー** — アクリルキーホルダー等
- **ピンバッジ** — キャラクターピンバッジ

### ゴール

手元の商品に合ったシンプルなカテゴリ構成に変更し、管理画面・フロントエンド・SEO・シードデータを一貫して更新する。

---

## 2. 新カテゴリ定義

### 2-1. カテゴリ

| ID | 英語表示 | スウェーデン語表示 | 説明 |
|----|---------|------------------|------|
| `figures` | Figures | Figurer | フィギュア全般（大小問わず） |
| `keychains` | Keychains | Nyckelringar | キーホルダー・ストラップ |
| `pins` | Pins & Badges | Pins & Märken | ピンバッジ |
| `other` | Other | Övrigt | 上記に当てはまらないもの |

**削除するカテゴリ:** `scale-figures`, `nendoroid`, `figma`, `prize-figures`, `garage-kits`

> **将来の拡張:** Nendoroid 等を仕入れた場合、カテゴリを追加すればよい。constants.ts に1行追加するだけで全UIに反映される設計は維持する。

### 2-2. コンディション（変更なし、意味の明確化のみ）

| ID | 英語表示 | スウェーデン語表示 | 想定される状態 |
|----|---------|------------------|--------------|
| `new` | New | Ny | 新品・未開封（箱あり） |
| `like_new` | Like New | Som ny | 開封済み・箱あり・美品 |
| `good` | Good | Bra | 箱なし・状態良好 |
| `fair` | Fair | Hyfsat | 箱なし・使用感あり |

コンディションの値・ラベルはコード上の変更なし。README やドキュメントでの意味説明のみ追加。

---

## 3. 影響範囲と変更内容

### 3-1. 変更ファイル一覧

| # | ファイルパス | 変更内容 | 難易度 |
|---|------------|---------|--------|
| 1 | `src/lib/constants.ts` | CATEGORIES, CATEGORY_LABELS を新定義に差し替え | 低 |
| 2 | `src/lib/constants.test.ts` | テスト修正（カテゴリ数: 7→4、カテゴリ名変更） | 低 |
| 3 | `src/app/layout.tsx` | metadata.keywords の旧カテゴリ名を新カテゴリ名に更新 | 低 |
| 4 | `src/messages/en.json` | seo.homeDescription, seo.productsDescription の旧カテゴリ名を更新 | 低 |
| 5 | `src/messages/sv.json` | 同上（スウェーデン語版） | 低 |
| 6 | `src/app/admin/sales/page.tsx` | `c.category.replace(/-/g, " ")` → CATEGORY_LABELS 参照に変更 | 低 |
| 7 | `src/app/admin/page.tsx` | 同上（ダッシュボードのカテゴリ別売上表示） | 低 |
| 8 | `src/app/admin/products/page.tsx` | `product.category.replace(/-/g, " ")` → CATEGORY_LABELS 参照に変更 | 低 |
| 9 | `src/lib/db/seed.sql` | シードデータのカテゴリを新カテゴリに更新 | 低 |
| 10 | `tests/phase2-seed-data.sql` | テスト用シードデータのカテゴリを新カテゴリに更新 | 低 |

### 3-2. 自動追従により変更不要なファイル

以下は CATEGORIES / CATEGORY_LABELS を参照しているため、constants.ts の変更で自動追従する。

| ファイルパス | 理由 |
|------------|------|
| `src/lib/admin-validation.ts` | CATEGORIES を参照してバリデーション |
| `src/components/admin/ProductForm.tsx` | CATEGORIES, CATEGORY_LABELS で選択肢生成 |
| `src/components/products/CategoryFilter.tsx` | CATEGORIES, CATEGORY_LABELS でフィルタ生成 |
| `src/components/products/ProductCard.tsx` | コンディションのみ参照（変更なし） |
| `src/app/[locale]/products/[id]/page.tsx` | CATEGORY_LABELS で表示 |
| `src/lib/db/schema.ts` | category は TEXT 型（enum ではない） |
| `src/lib/db/queries.ts` | 文字列比較のみ |
| `src/lib/db/admin-queries.ts` | 同上 |
| `src/app/api/products/route.ts` | 文字列パススルー |
| `src/app/api/admin/products/route.ts` | バリデーションは admin-validation.ts 経由 |
| `src/app/api/admin/products/[id]/route.ts` | 同上 |

### 3-3. 変更が必要なファイルの詳細

#### (1) `src/lib/constants.ts`

**変更前:**
```typescript
export const CATEGORIES = [
  "figures",
  "scale-figures",
  "nendoroid",
  "figma",
  "prize-figures",
  "garage-kits",
  "other",
] as const;

export const CATEGORY_LABELS: Record<Category, { en: string; sv: string }> = {
  figures: { en: "Figures", sv: "Figurer" },
  "scale-figures": { en: "Scale Figures", sv: "Skalfigurer" },
  nendoroid: { en: "Nendoroid", sv: "Nendoroid" },
  figma: { en: "Figma", sv: "Figma" },
  "prize-figures": { en: "Prize Figures", sv: "Prisfigurer" },
  "garage-kits": { en: "Garage Kits", sv: "Garage Kits" },
  other: { en: "Other", sv: "Ovrigt" },
};
```

**変更後:**
```typescript
export const CATEGORIES = [
  "figures",
  "keychains",
  "pins",
  "other",
] as const;

export const CATEGORY_LABELS: Record<Category, { en: string; sv: string }> = {
  figures: { en: "Figures", sv: "Figurer" },
  keychains: { en: "Keychains", sv: "Nyckelringar" },
  pins: { en: "Pins & Badges", sv: "Pins & Märken" },
  other: { en: "Other", sv: "Övrigt" },
};
```

> **注意:** スウェーデン語の "Övrigt" は正しいウムラウト表記に修正（現在 "Ovrigt" になっている）。

#### (2) `src/lib/constants.test.ts`

テストの期待値を更新:
- カテゴリ数: 7 → 4
- カテゴリ値: 新しい4カテゴリに合わせる
- コンディションのテストは変更なし

#### (3) `src/app/layout.tsx` (L14-22)

**変更前:**
```typescript
keywords: [
  "anime figures",
  "nendoroid",
  "scale figures",
  "figma",
  "Uppsala",
  "Sweden",
  "anime collectibles",
  "Japanese figures",
],
```

**変更後:**
```typescript
keywords: [
  "anime figures",
  "anime keychains",
  "anime pins",
  "Uppsala",
  "Sweden",
  "anime collectibles",
  "Japanese figures",
],
```

#### (4) `src/messages/en.json` — SEO メタディスクリプション

**homeDescription 変更前:**
```
"Hand-picked anime collectibles from Japan, available for local pickup in Uppsala, Sweden. Browse figures, nendoroids, scale figures, and more."
```

**homeDescription 変更後:**
```
"Hand-picked anime collectibles from Japan, available for local pickup in Uppsala, Sweden. Browse figures, keychains, pins, and more."
```

**productsDescription 変更前:**
```
"Browse our collection of premium anime figures. Nendoroids, scale figures, figma, and more available for local pickup in Uppsala."
```

**productsDescription 変更後:**
```
"Browse our collection of anime figures, keychains, and pins. Available for local pickup and delivery in Uppsala, Sweden."
```

#### (5) `src/messages/sv.json` — SEO メタディスクリプション（スウェーデン語版）

**homeDescription 変更前:**
```
"Handplockade anime samlarfigurer fran Japan, tillgangliga for lokal avhamtning i Uppsala, Sverige. Blaeddra bland figurer, nendoroids, skalfigurer och mer."
```

**homeDescription 変更後:**
```
"Handplockade anime-samlarföremål från Japan, tillgängliga för lokal avhämtning i Uppsala, Sverige. Bläddra bland figurer, nyckelringar, pins och mer."
```

**productsDescription 変更前:**
```
"Blaeddra i vart sortiment av premium animefigurer. Nendoroids, skalfigurer, figma och mer tillgangligt for lokal avhamtning i Uppsala."
```

**productsDescription 変更後:**
```
"Bläddra i vårt sortiment av anime-figurer, nyckelringar och pins. Tillgängligt för lokal avhämtning och leverans i Uppsala, Sverige."
```

> **注意:** 現在のスウェーデン語テキストはウムラウト・アクセント記号が ASCII 化されている（`fran` → `från`, `tillgangliga` → `tillgängliga` 等）。この機会に正しいスウェーデン語表記に修正する。

#### (6) `src/app/admin/sales/page.tsx` (L144-145) — カテゴリ別売上表示

**変更前:**
```tsx
<p className="text-sm font-medium capitalize text-gray-500">
  {c.category.replace(/-/g, " ")}
</p>
```

**変更後:**
```tsx
import { CATEGORY_LABELS, type Category } from "@/lib/constants";
// ...
<p className="text-sm font-medium capitalize text-gray-500">
  {CATEGORY_LABELS[c.category as Category]?.en || c.category}
</p>
```

> `replace(/-/g, " ")` のハック的な表示では `pins` が "pins" になり "Pins & Badges" にならない。CATEGORY_LABELS を正式に参照する。

#### (7) `src/app/admin/page.tsx` (L251-252) — ダッシュボードのカテゴリ別売上

同じパターンで修正:

**変更前:**
```tsx
<p className="text-sm font-medium capitalize text-gray-900">
  {c.category.replace(/-/g, " ")}
</p>
```

**変更後:**
```tsx
import { CATEGORY_LABELS, type Category } from "@/lib/constants";
// ...
<p className="text-sm font-medium capitalize text-gray-900">
  {CATEGORY_LABELS[c.category as Category]?.en || c.category}
</p>
```

#### (8) `src/app/admin/products/page.tsx` (L180) — 商品一覧テーブルのカテゴリ表示

**変更前:**
```tsx
{product.category.replace(/-/g, " ")}
```

**変更後:**
```tsx
{CATEGORY_LABELS[product.category as Category]?.en || product.category}
```

> 既に L7 で `CATEGORIES, CATEGORY_LABELS` を import しているが、`Category` 型が不足している場合は追加。

#### (9) `src/lib/db/seed.sql` — シードデータ

**変更前:** prod-001 が `scale-figures`、prod-002 が `nendoroids`
**変更後:** 両方とも `figures` に変更

```sql
-- prod-001: scale-figures → figures
-- prod-002: nendoroids → figures
```

#### (10) `tests/phase2-seed-data.sql` — テスト用シードデータ

全6件のテスト商品のカテゴリを更新:

| 商品ID | 変更前 | 変更後 |
|--------|--------|--------|
| test-prod-001 | `scale-figures` | `figures` |
| test-prod-002 | `nendoroids` | `figures` |
| test-prod-003 | `scale-figures` | `figures` |
| test-prod-004 | `scale-figures` | `keychains` |
| test-prod-005 | `scale-figures` | `pins` |
| test-prod-006 | `scale-figures` | `figures` |

> test-prod-004, 005 は新カテゴリのテストカバレッジのため keychains, pins に振り分ける。商品名は figure のままだがテスト用途なので問題なし。

---

## 4. DBデータマイグレーション

### 4-1. 既存データへの影響

DB の `products.category` カラムは TEXT 型のため、スキーマ変更は不要。

ただし、既に登録されている商品のうち削除カテゴリ（`scale-figures`, `nendoroid`, `figma`, `prize-figures`, `garage-kits`）を持つレコードがあると、フロントエンドでラベルが取得できずフォールバック表示（生の ID 文字列）になる。

### 4-2. マイグレーション方針

**現時点で本番DBに商品データが存在するか確認が必要。**

- **商品データなし（空）の場合:** マイグレーション不要。そのまま新カテゴリで商品登録を開始。
- **商品データありの場合:** バックアップ取得後、旧カテゴリを `figures` にマッピング。

### 4-3. 実行手順

```bash
# 1. 本番DBの商品数を確認
npx wrangler d1 execute animehubs-db --remote --command "SELECT category, COUNT(*) as count FROM products GROUP BY category;"

# 2. バックアップ: マイグレーション対象レコードを記録（商品データがある場合）
npx wrangler d1 execute animehubs-db --remote --command "SELECT id, name_en, category FROM products WHERE category IN ('scale-figures', 'nendoroid', 'figma', 'prize-figures', 'garage-kits');"

# 3. マイグレーション実行（対象レコードがある場合のみ）
npx wrangler d1 execute animehubs-db --remote --command "UPDATE products SET category = 'figures' WHERE category IN ('scale-figures', 'nendoroid', 'figma', 'prize-figures', 'garage-kits');"

# 4. 結果確認
npx wrangler d1 execute animehubs-db --remote --command "SELECT category, COUNT(*) as count FROM products GROUP BY category;"

# 5. ローカルDBも同様に実行（必要な場合）
npx wrangler d1 execute animehubs-db --local --command "UPDATE products SET category = 'figures' WHERE category IN ('scale-figures', 'nendoroid', 'figma', 'prize-figures', 'garage-kits');"
```

### 4-4. ロールバック手順

UPDATE による旧カテゴリ→`figures` への統合は **不可逆操作**（元のカテゴリ値を復元できない）。

- Step 2 で対象レコードの `id` と `category` を記録しておくこと
- 万一ロールバックが必要な場合、記録した情報をもとに個別に UPDATE で復元する

```bash
# ロールバック例（Step 2 の記録をもとに実行）
npx wrangler d1 execute animehubs-db --remote --command "UPDATE products SET category = 'scale-figures' WHERE id = 'xxx';"
```

> 実際には商品数が少ないため、ロールバックが必要になるリスクは低い。

---

## 5. 実装手順

### Step 1: 本番DBの現状確認

本番に商品データがあるか確認し、マイグレーション要否を判断。

### Step 2: `constants.ts` の更新

CATEGORIES, CATEGORY_LABELS を新定義に差し替え。

### Step 3: SEO 関連ファイルの更新

- `src/app/layout.tsx` の metadata.keywords を更新
- `src/messages/en.json` の seo.homeDescription, seo.productsDescription を更新
- `src/messages/sv.json` の seo.homeDescription, seo.productsDescription を更新

### Step 4: 管理画面のカテゴリ表示修正

- `src/app/admin/sales/page.tsx` — CATEGORY_LABELS 参照に変更
- `src/app/admin/page.tsx` — CATEGORY_LABELS 参照に変更
- `src/app/admin/products/page.tsx` — CATEGORY_LABELS 参照に変更

### Step 5: シードデータの更新

- `src/lib/db/seed.sql` のカテゴリを更新
- `tests/phase2-seed-data.sql` のカテゴリを更新

### Step 6: テストの更新

`constants.test.ts` のカテゴリ関連テストを新定義に合わせて修正。

### Step 7: テスト実行・型チェック・lint

```bash
npm run test
npx tsc --noEmit
npm run lint
```

### Step 8: DBマイグレーション（必要な場合のみ）

Step 1 で商品データがある場合、バックアップを取ってから旧カテゴリのレコードを更新。

### Step 9: ビルド確認

```bash
npm run build:cf
```

---

## 6. テスト計画

### 自動テスト

| テスト | 内容 | 期待結果 |
|--------|------|---------|
| constants.test.ts | カテゴリ数が4であること | PASS |
| constants.test.ts | 全カテゴリにラベルがあること | PASS |
| constants.test.ts | コンディション数が4であること（変更なし） | PASS |
| 型チェック | `npx tsc --noEmit` がエラーなし | PASS |
| lint | `npm run lint` がエラーなし | PASS |

### 手動テスト（管理画面）

| # | テスト項目 | 手順 | 期待結果 |
|---|----------|------|---------|
| 1 | 商品作成 — カテゴリ選択肢 | /admin/products/new を開く | Figures, Keychains, Pins & Badges, Other の4つが表示 |
| 2 | 商品作成 — 各カテゴリで保存 | 各カテゴリを選んで商品を作成 | 正常に保存される |
| 3 | 商品一覧 — カテゴリフィルタ | /admin/products でフィルタを切り替え | 新カテゴリでフィルタが動作する |
| 4 | 商品一覧 — カテゴリ表示 | /admin/products のテーブルを確認 | "Pins & Badges" 等がラベル表記で表示される |
| 5 | 商品編集 — カテゴリ変更 | 既存商品のカテゴリを変更して保存 | 正常に更新される |
| 6 | ダッシュボード — カテゴリ別売上 | /admin のカテゴリ別売上を確認 | カテゴリ名がラベル表記で表示される |
| 7 | 売上分析 — カテゴリ別売上 | /admin/sales のカテゴリ別売上を確認 | カテゴリ名がラベル表記で表示される |

### 手動テスト（フロントエンド）

| # | テスト項目 | 手順 | 期待結果 |
|---|----------|------|---------|
| 8 | 商品一覧 — カテゴリフィルタ | /products でフィルタボタンを確認 | All, Figures, Keychains, Pins & Badges, Other の5つ表示 |
| 9 | 商品一覧 — フィルタ動作 | 各カテゴリボタンをクリック | 該当カテゴリの商品のみ表示 |
| 10 | 商品詳細 — カテゴリ表示 | 商品詳細ページを開く | カテゴリ名が正しく表示（英語/スウェーデン語） |
| 11 | 多言語切替 | sv に切り替えてカテゴリ名を確認 | Figurer, Nyckelringar, Pins & Märken, Övrigt と表示 |

### 手動テスト（SEO）

| # | テスト項目 | 手順 | 期待結果 |
|---|----------|------|---------|
| 12 | メタキーワード | ページソースで meta keywords を確認 | 旧カテゴリ名（nendoroid, scale figures 等）が含まれていない |
| 13 | メタディスクリプション(en) | /en のページソースを確認 | "figures, keychains, pins" を含む |
| 14 | メタディスクリプション(sv) | /sv のページソースを確認 | "figurer, nyckelringar, pins" を含む |

---

## 7. リスク・注意点

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存商品の旧カテゴリ | ラベルが取得できずフォールバック表示 | Step 1 でデータ確認、必要ならマイグレーション |
| DB マイグレーションが不可逆 | 元のカテゴリ値を復元できない | マイグレーション前に対象レコードを記録（Section 4-3 Step 2） |
| URL の `?category=scale-figures` 等のブックマーク | フィルタが機能しない（全件表示になる） | 影響軽微。ユーザーはフィルタを再選択するだけ |
| SEO メタ情報の変更 | 検索エンジンのインデックス更新にタイムラグ | 影響軽微。旧カテゴリ名での検索流入はほぼないと想定 |

---

## 8. 今回変更しないもの

- **コンディション定義** — 値・ラベルともにコード変更なし
- **DBスキーマ** — TEXT 型のまま、マイグレーションファイル追加なし
- **API インターフェース** — リクエスト/レスポンスの形式は変更なし
