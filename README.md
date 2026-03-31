# AnimeHubs

スウェーデン Uppsala でアニメフィギュアを輸入販売する対面受け渡し型 EC サイト。

- ログイン・オンライン決済なし — 予約と連絡のみのシンプル設計
- 英語 / スウェーデン語の2言語対応
- ターゲット: 地元スウェーデン人（アニメファン）

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| DB | Cloudflare D1 (SQLite互換) + Drizzle ORM |
| メール | Resend + React Email |
| 多言語 | next-intl (en / sv) |
| テスト | Vitest + React Testing Library |

## 主な機能

- **商品一覧 / 詳細** — カテゴリフィルタ、検索、お気に入り（localStorage）
- **カート & 予約フロー** — 名前・メール入力 → 受け渡し場所・時間帯選択 → 確認メール送信
- **Instagram DM フロー** — 場所・時間をDMで柔軟調整
- **管理画面 (/admin)** — 商品CRUD、予約一覧・ステータス管理、売上集計
- **SEO** — メタタグ・OGP・sitemap・robots 対応

## ローカル開発

```bash
npm install
npm run dev       # http://localhost:3000
npm run test      # テスト実行
npm run lint      # ESLint
```

### 環境変数

`.env.example` を `.env.local` にコピーして必要な値を設定:

```bash
cp .env.example .env.local
```

| 変数名 | 説明 |
|--------|------|
| `RESEND_API_KEY` | Resend の API キー |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス |
| `JWT_SECRET` | 管理画面認証用（32文字以上） |
| `ADMIN_PASSWORD_HASH` | 管理者パスワードの bcrypt ハッシュ |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Instagram プロフィール URL |

### DB セットアップ

```bash
npm run db:migrate   # マイグレーション実行
npm run db:seed      # シードデータ投入
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

### 初回セットアップ済み内容（備忘録）

| 項目 | 内容 |
|------|------|
| Cloudflare プロジェクト名 | `animehubs` |
| D1 データベース名 | `animehubs-db` |
| D1 データベース ID | `6193c47d-7779-46b8-a5a0-14adb909ed99` |
| Build command | `npx @opennextjs/cloudflare build` |
| Deploy command | `npx wrangler deploy` |
| 設定ファイル | `wrangler.toml`, `open-next.config.ts` |

### D1 マイグレーション（初回のみ）

```bash
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/0000_init.sql --remote
```

### 画像アップロードについて

現在 `/api/upload` は **503** を返す（Cloudflare R2 未設定）。
画像を追加したい場合は `public/uploads/` にファイルを置いて commit & push する。

詳細手順は [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) を参照。

## 受け渡し場所

- Uppsala Central Station（ウプサラ中央駅）
- Stora Torget（中央駅から徒歩2〜3分）
- Forumgallerian（駅近くのショッピングモール）
