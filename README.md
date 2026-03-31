# AnimeHubs

スウェーデン Uppsala でアニメフィギュアを輸入販売する対面受け渡し型 EC サイト。

- ログイン・オンライン決済なし — 予約と連絡のみのシンプル設計
- 英語 / スウェーデン語の2言語対応
- ターゲット: 地元スウェーデン人（アニメファン）

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイル | Tailwind CSS v4 + shadcn/ui |
| DB | SQLite + Drizzle ORM (better-sqlite3) |
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

Cloudflare Pages + D1 へのデプロイ手順は [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) を参照。

## 受け渡し場所

- Uppsala Central Station（ウプサラ中央駅）
- Stora Torget（中央駅から徒歩2〜3分）
- Forumgallerian（駅近くのショッピングモール）
