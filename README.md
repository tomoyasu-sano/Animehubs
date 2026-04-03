# AnimeHubs

スウェーデン Uppsala でアニメフィギュアを輸入販売する EC サイト。

- Google OAuth ログイン + Stripe オンライン決済対応
- 対面受け渡し（Inspection）と配送（Delivery）の2つの購入フロー
- 英語 / スウェーデン語の2言語対応
- ターゲット: 地元スウェーデン人（アニメファン）

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| DB | Cloudflare D1 (SQLite互換) + Drizzle ORM |
| 認証 | NextAuth v5 (Google OAuth, JWT戦略) |
| 決済 | Stripe Checkout (price_data方式) |
| メール | Resend + React Email |
| 多言語 | next-intl (en / sv) |
| テスト | Vitest + React Testing Library |
| デプロイ | Cloudflare Workers (@opennextjs/cloudflare) |

## 主な機能

- **商品一覧 / 詳細** — カテゴリフィルタ、検索、お気に入り
- **Inspection フロー（対面受け渡し）** — 予約 → Instagram DM で調整 → 対面確認 → Pay Now (Stripe) → 完了
- **Delivery フロー（配送）** — カート → Stripe Checkout → 決済完了 → 発送 → 完了
- **注文管理** — ユーザーの注文一覧・詳細表示、ステータス追跡
- **管理画面 (/admin)** — 商品CRUD、注文管理・ステータス遷移、売上集計
- **SEO** — メタタグ・OGP・sitemap・robots 対応

## ローカル開発

Cloudflare Workers 環境で動作するため、wrangler を使って開発する。

```bash
npm install
npm run build:cf     # OpenNext ビルド（初回・設定変更時に必須）
npm run dev:cf       # wrangler dev 起動 (http://localhost:8787)
npm run test         # テスト実行
npm run lint         # ESLint
```

> **注意**: `npm run dev:cf` は `.open-next/` のビルド済みファイルを参照する。ソースコード変更後は `npm run build:cf` を再実行してから `npm run dev:cf` を再起動すること。

### 環境変数

`.env.local` に以下を設定:

| 変数名 | 説明 |
|--------|------|
| `AUTH_SECRET` | NextAuth のシークレットキー |
| `AUTH_GOOGLE_ID` | Google OAuth クライアント ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット |
| `AUTH_TRUST_HOST` | `true`（Cloudflare Workers 環境で必須） |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開キー |
| `RESEND_API_KEY` | Resend の API キー |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス |
| `JWT_SECRET` | 管理画面認証用（32文字以上） |
| `ADMIN_PASSWORD_HASH` | 管理者パスワードの bcrypt ハッシュ |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Instagram プロフィール URL |
| `NEXT_PUBLIC_SITE_URL` | サイトURL（OGP等に使用） |
| `NEXT_PUBLIC_BASE_URL` | ベースURL（メール内リンク等に使用） |
| `CRON_SECRET` | Cron エンドポイント認証用シークレット |

### DB セットアップ（ローカル）

```bash
# ローカル D1 にマイグレーション適用
npx wrangler d1 execute animehubs-db --local --file=src/lib/db/migrations/0000_init.sql
npx wrangler d1 execute animehubs-db --local --file=src/lib/db/migrations/0001_v2_schema.sql
npx wrangler d1 execute animehubs-db --local --file=src/lib/db/migrations/0002_favorites_unique_index.sql
```

## デプロイ

Cloudflare Workers + D1 構成。`@opennextjs/cloudflare` を使用。

### 自動デプロイ（通常の開発フロー）

```
git push origin main
    ↓
GitHub webhook → Cloudflare がトリガー
    ↓
npm ci → npx @opennextjs/cloudflare build → npx wrangler deploy
    ↓
デプロイ完了
```

**main ブランチに push するだけで自動ビルド＆デプロイされる。**
進捗は Cloudflare ダッシュボード「Deployments」タブで確認。

### 本番環境変数

環境変数は `npx wrangler secret put 変数名` で設定する（Dashboard の環境変数は Workers に届かない）。

### 初回セットアップ済み内容（備忘録）

| 項目 | 内容 |
|------|------|
| Cloudflare プロジェクト名 | `animehubs` |
| D1 データベース名 | `animehubs-db` |
| D1 データベース ID | `6193c47d-7779-46b8-a5a0-14adb909ed99` |
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command | `npx wrangler deploy` |
| 設定ファイル | `wrangler.toml`, `open-next.config.ts` |

### D1 マイグレーション（本番）

```bash
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/0000_init.sql --remote
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/0001_v2_schema.sql --remote
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/0002_favorites_unique_index.sql --remote
```

### 本番運用コマンド

```bash
# リアルタイムログ
npx wrangler tail animehubs

# 本番DB操作
npx wrangler d1 execute animehubs-db --remote --command "SQL文"
```

### 画像アップロードについて

現在 `/api/upload` は **503** を返す（Cloudflare R2 未設定）。
画像を追加したい場合は `public/uploads/` にファイルを置いて commit & push する。

詳細手順は [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) を参照。

## 認証

| 対象 | 方式 |
|------|------|
| 顧客 | Google OAuth (NextAuth v5, JWT戦略) |
| 管理者画面 | JWT + bcrypt パスワード認証（別系統） |

管理者メールは `src/lib/constants.ts` の `ADMIN_EMAILS` で定義。Google ログイン時に自動で `role='admin'` が付与される。

## 受け渡し場所

- Uppsala Central Station（ウプサラ中央駅）
- Stora Torget（中央駅から徒歩2〜3分）
- Forumgallerian（駅近くのショッピングモール）

## 運用ドキュメント

- [docs/operations-guide.md](docs/operations-guide.md) — メール・ステータス遷移・管理画面操作・デプロイ・DB操作
- [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) — Cloudflare デプロイ詳細手順
