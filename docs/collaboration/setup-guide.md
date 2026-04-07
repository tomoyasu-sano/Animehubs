# 共同開発セットアップガイド

## 1. 環境構築

### リポジトリのクローン

```bash
git clone https://github.com/<owner>/AnimeHubs.git
cd AnimeHubs
npm install
```

### 環境変数の設定

`.env.local` を作成し、必要な環境変数を設定する。
値はリポジトリオーナーから直接受け取ること（Slack等の安全な経路で共有）。

```bash
# .env.local に以下のキーを設定
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
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
