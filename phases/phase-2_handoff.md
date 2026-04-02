# Phase 2 → Phase 3 引き継ぎ

## 生成日時: 2026-04-02

## Phase 2 完了サマリー

### 実装した内容
- NextAuth v5 (JWT戦略) + Google OAuth認証（src/lib/auth-v2.ts）
- SessionProvider（src/components/Providers.tsx → layout.tsx）
- ログインページ（src/app/[locale]/auth/login/page.tsx）
- ヘッダーにログイン/ログアウトボタン
- お気に入りAPI: GET/POST /api/favorites, DELETE /api/favorites/[productId]
- お気に入りDB操作（src/lib/db/favorite-queries.ts）+ UNIQUE制約
- useFavorites: localStorage → API永続化、楽観的更新、likesDeltas
- お気に入り一覧ページ（src/app/[locale]/favorites/page.tsx）
- useCart: reservedStock対応、認証チェック（未認証時は空+操作無効）、カスタムイベント同期（全インスタンス即時反映）
- AddToCartButton: 認証リダイレクト、緑色フィードバック、在庫上限チェック
- 在庫バッジ: Only X left (amber), Out of Stock (overlay)
- UUID入力バリデーション（API）
- favoritesテーブルにUNIQUEインデックス追加（マイグレーション0002）
- i18n: en.json/sv.jsonにfavorites, auth関連キー追加

### テスト結果
| カテゴリ | 結果 |
|----------|------|
| 単体テスト | 141 passed, 3 skipped |
| ESLint | 0 errors, 0 warnings |
| TypeScript | 0 errors |
| コードレビュー | CRITICAL: 0, HIGH: 0（修正済み） |
| セキュリティ | CRITICAL: 0 |
| 人間テスト | PASS |

### 未解決事項（Phase 3以降で対応）
- レート制限: Cloudflare WAFで対応推奨（コード側未実装）
- useCartのstock/reservedStockがlocalStorageに保存されるため古くなる可能性 → チェックアウト時にサーバー側で再検証必須
- Lighthouseスコア: 開発サーバーでLCP 6.6s → 本番ビルドで再計測必要
- favorites/page.tsxとuseFavoritesでAPIを2重フェッチ → リファクタフェーズで改善

### 技術的な判断メモ
- **JWT戦略を採用**: D1 + DrizzleAdapterのdatabase sessionに互換性問題があるため
- **カスタムイベント同期**: useSyncExternalStoreのstorageイベントは同一タブ内では発火しないため、cart-updatedカスタムイベントを追加
- **localItems削除**: useCartからlocalItems Stateを削除し、getSnapshot()キャッシュ更新+カスタムイベントで全インスタンス即時同期に統一
- **在庫管理**: stock はStripe決済完了（webhook）時に減少。reservedStock はチェックアウトセッション作成時に増加

---

## Phase 3 指示

### 実装範囲
Phase 3は管理画面: 管理者認証、商品CRUD、予約管理、売上集計ダッシュボード。
詳細は phases/phase-3_plan.md を参照。

### 前提条件
- 認証基盤: src/lib/auth-v2.ts（NextAuth v5 + Google OAuth）
- 管理者判定: src/lib/constants.ts の ADMIN_EMAILS
- DBスキーマ: src/lib/db/schema.ts（products, users, favorites, orders等）
- 既存の管理者認証: src/lib/auth.ts（パスワード+JWT、Phase 1実装）→ Phase 3でGoogle OAuth統合に移行検討

### 注意事項
- Cloudflare D1はトランザクション未対応。db.batch()で代替
- Edge Runtime環境: Node.js固有API（crypto.subtle以外のcrypto等）は使用不可
- sharp（画像リサイズ）はEdge Runtimeで動作しない → Cloudflare Images または別の方法を検討

### 参照すべきファイル
- 仕様書: specs/20260331_animehubs_v2_spec.md
- 実装ガイド: specs/20260402_implementation_guide.md
- Phase計画: phases/phase-3_plan.md
- テストレポート: test-reports/20260402_2359_phase-2_visual-test.md
- CLAUDE.md
