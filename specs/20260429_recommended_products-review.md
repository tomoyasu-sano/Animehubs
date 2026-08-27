# 仕様書レビュー結果

対象: specs/20260429_recommended_products.md
日時: 2026-04-29

## 指摘サマリ

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 4 |

## CRITICAL

- [ ] **ProductCard（Client Component）と RecommendedProducts（Server Component）の設計矛盾** — DB・API / UX / 要件
  - `ProductCard` は `"use client"` で `isFavorite: boolean` と `onToggleFavorite: (productId: string) => void` が必須 props。仕様では `RecommendedProducts` を RSC と定義しているが、これらの props をどう供給するかが未定義。
  - 提案: (A) Client Component に変更、(B) RSC でデータ取得し Client ラッパー経由で ProductCard を描画（推奨）、(C) お気に入り機能なしバリアントを用意 — のいずれかを仕様に明記する。

## HIGH

- [ ] **SQL サンプルが Phase 2 のソート仕様と不一致** — DB・API / 要件
  - 3.1節では Phase 2 を「人気順（`likesCount DESC`）→ 新着順」と定義しているが、4.1節の SQL は `created_at DESC` のみ。Phase 1 用と Phase 2 用の SQL を分けて記載すべき。
- [ ] **商品詳細ページ内の配置位置が曖昧** — 要件
  - 既存ページは2カラムグリッド。おすすめセクションをグリッド内（右カラム）に置くか外（全幅）に置くかで4列レイアウトの成否が変わる。「2カラムグリッドの外側、`max-w-5xl` コンテナ内側に全幅配置」等と具体的に指定すべき。
- [ ] **おすすめ商品間のページ遷移時の再取得挙動が未定義** — UX
  - おすすめ商品クリック → 遷移先で新しいおすすめが表示されるかが不明。Next.js のクライアントサイドキャッシュにより古いおすすめが残る可能性。`revalidate` や `dynamic` 設定の方針を明記すべき。

## MEDIUM

- [ ] **`excludeId` / `category` の入力バリデーション方針が未記載** — セキュリティ / DB・API
  - URL パラメータ由来の値。Drizzle ORM のパラメータ化で SQL インジェクションリスクは低いが、空文字・不正値の挙動を仕様として明記すべき。
- [ ] **`limit` パラメータの上限・下限制約が未定義** — セキュリティ
  - 異常値（負数、0、極大値）が渡された場合の挙動が未定義。「1〜20 にクランプ」等の制約を追記すべき。
- [ ] **テストケースの不足: Phase 1→2 結合の境界値、likesCount 同数時ソート** — DB・API / UX / 要件
  - 「同カテゴリ3件 + 他カテゴリ1件」の混合ケース、likesCount 同数時の新着順ソート検証、「同カテゴリに自分自身のみ」のケースが欠落。
- [ ] **レスポンシブ: タブレット幅（640px〜1024px）のカラム数が未定義** — UX
  - 既存 ProductGrid は `grid-cols-2 lg:grid-cols-3` だが、おすすめは4列固定。タブレット幅でカードが小さくなる可能性。中間ブレークポイントの検討が必要。
- [ ] **E2E テスト方針の欠如** — UX
  - 回遊率向上が主目的なのに、「おすすめクリック → 遷移 → 新おすすめ表示」の E2E テストケースがない。
- [ ] **2回の DB クエリ発行のパフォーマンス考慮が未記載** — DB・API / 要件
  - Phase 1 + Phase 2 で2回クエリ。現在は問題ないが、`getDb()` を1回のみ呼ぶ方針や将来の1クエリ統合を検討すべき旨を記載する。

## LOW

- [ ] **在庫切れ商品をおすすめ表示する UX 的是非の検討** — UX / 要件
  - 現仕様では在庫なしも表示。購入できない商品をおすすめする意味があるか、ビジネス判断が必要。
- [ ] **`createdAt` が text 型のため ISO 8601 フォーマット前提が暗黙** — DB・API
  - SQLite のテキストソートが正しく機能する前提条件を注記すべき。
- [ ] **ローディング状態（Suspense fallback）の UX が未定義** — UX
  - RSC でのデータ取得中のスケルトン UI 方針が未記載。
- [ ] **セクションタイトルのデザイントークン（フォントサイズ、色等）が未指定** — UX

## 判定

**結果: 不合格**

不合格理由:
- CRITICAL 1件（ProductCard の Server/Client Component 設計矛盾）が残存
- HIGH 3件（SQL不整合、配置位置の曖昧さ、遷移時挙動の未定義）

合格条件: CRITICAL 0件かつ HIGH 2件以下

### 次のアクション

1. **CRITICAL を解決**: RecommendedProducts の実装方針（RSC + Client ラッパー推奨）を仕様に追記
2. **HIGH 3件を修正**: SQL サンプル分離、配置位置の具体化、ページ遷移時の挙動定義
3. 修正後に再レビュー実施

---

# 再レビュー結果（修正後）

対象: specs/20260429_recommended_products.md
日時: 2026-04-29

## 前回指摘の対応状況

| 重要度 | 指摘 | 対応 |
|--------|------|------|
| CRITICAL | ProductCard Server/Client 設計矛盾 | **解決** — RSC + RecommendedProductsGrid（Client）分離を4.2節に明記 |
| HIGH | SQL サンプル Phase 2 不整合 | **解決** — Phase 1/2 の SQL を分離記載（4.1節） |
| HIGH | 配置位置の曖昧さ | **解決** — グリッド外・max-w-5xl 内 + JSX例追加（3.2/4.3節） |
| HIGH | ページ遷移時の挙動 | **解決** — 新セクション 4.4 で RSC 再実行の説明を追加 |
| MEDIUM | 入力バリデーション | **解決** — excludeId/category/limit の挙動を4.1節に明記 |
| MEDIUM | limit 上限制約 | **解決** — 1〜20 クランプを明記 |
| MEDIUM | テストケース不足 | **解決** — 境界値、likesCount同数、空文字等を5.1節に追加 |
| MEDIUM | タブレット幅 | **解決** — 3列を3.2節に追加 |
| MEDIUM | E2E テスト | **解決** — 5.3節を新設 |
| MEDIUM | DB クエリパフォーマンス | **解決** — getDb() 1回方針 + 将来統合の備考を追加 |
| LOW | 在庫切れ UX | **解決** — リスク表に判断根拠を追記 |
| LOW | createdAt text 型 | **解決** — ISO 8601 前提をリスク表に追記 |
| LOW | ローディング状態 | **解決** — Suspense + スケルトン UI を3.2/4.3節に明記 |
| LOW | デザイントークン | **解決** — text-lg font-semibold、ボーダー指定を追記 |

## 残存指摘

### LOW（新規・軽微）

1. **RecommendedProductsGrid と既存 ProductGrid の関係性の明確化** — 4.2節で「既存の ProductGrid をラッパーとして再利用」と記載しつつ、変更ファイル一覧では新規作成。ProductGrid を直接使わず同パターンで新規作成する意図であれば、その旨を一文追記すると実装者が迷わない。

## 指摘サマリ

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 |

## 判定

**結果: 合格**

前回の全14件の指摘がすべて適切に反映済み。CRITICAL 0件・HIGH 0件で合格条件を満たす。実装着手可能。
