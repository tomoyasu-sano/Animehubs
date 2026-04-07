# 共同開発セットアップガイド

## 1. 環境構築

### リポジトリのクローン

```bash
git clone https://github.com/tomoyasu-sano/Animehubs.git
cd Animehubs
npm install
```

### 環境変数の設定

`.env.local` を作成し、必要な環境変数を設定する。

#### フロントエンド修正のみの場合（最低限）

```bash
# .env.local
DATABASE_URL=./data/animehubs.db
NEXT_PUBLIC_SITE_URL=https://animehubs.se
NEXT_PUBLIC_BASE_URL=https://anime-hubs.com
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/animehubs_swe/
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # オーナーから受け取る
```

#### バックエンド（決済・メール・認証等）も修正する場合

上記に加えて、以下の変数が必要。値はリポジトリオーナーから直接受け取ること（Slack等の安全な経路で共有）。

```bash
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
JWT_SECRET=
ADMIN_PASSWORD_HASH=
CRON_SECRET=
NEWSLETTER_HMAC_SECRET=
```

> `.env.local` は `.gitignore` に含まれているため、コミットされない。

### 開発サーバーの起動

```bash
npm run dev
```

## 2. 開発ツール

| コマンド | 用途 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint 実行 |
| `npm run test` | テスト実行 |
