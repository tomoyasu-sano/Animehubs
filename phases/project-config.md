# プロジェクト設定

## 技術スタック
- フロントエンド: Next.js 15 (App Router) + TypeScript
- スタイル: Tailwind CSS v4 + shadcn/ui
- DB: SQLite + Drizzle ORM (better-sqlite3)
- メール送信: Resend + React Email
- 多言語: next-intl (en / sv)
- パッケージマネージャ: npm
- テスト: Vitest + React Testing Library
- リンター: ESLint + Prettier

## Phase 管理
- 総Phase数: 4
- 最後に完了したPhase: 3
- 次に開始すべきPhase: 4
- 追加仕様書の次番号（change_N）: 1

## 開発サーバー起動コマンド
- コマンド: npm run dev

## MCP サーバー・ブラウザ連携状態
- Playwright MCP: 未確認
- Chrome 連携: 未確認
- Lighthouse MCP: 未確認

## パフォーマンス閾値
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- INP (Interaction to Next Paint): < 200ms
- Performance スコア: > 90

## 仕様書一覧
- 要件サマリー: specs/20260323_animehubs_requirements.md
- 元仕様: specs/20260323_animehubs_spec.md
