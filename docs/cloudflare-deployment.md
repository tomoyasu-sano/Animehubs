# Cloudflare Pages + D1 デプロイガイド

## 概要

AnimeHubs を SQLite (better-sqlite3) から **Cloudflare D1**（SQLite互換）へ移行し、
**Cloudflare Pages** でホスティングする手順書。

- **月額コスト：ほぼ $0**（D1無料枠: 5GB / 2,500万reads/day）
- **自動デプロイ：GitHub push → Cloudflare Pages が自動ビルド＆デプロイ**

---

## 全体フロー

```
[あなた] Cloudflare 設定 (D1 DB作成 / Pages 連携)
   ↓
[Claude] コード移行 (better-sqlite3 → D1クライアント)
   ↓
[あなた] 環境変数の設定
   ↓
[Claude] マイグレーション・シード実行コマンド作成
   ↓
[あなた] 初回データ投入
   ↓
自動デプロイ開始（GitHub push → 本番反映）
```

---

## Part 1：あなたがやること（Cloudflare 設定）

### Step 1-1. Cloudflare アカウント確認

1. [dash.cloudflare.com](https://dash.cloudflare.com) にログイン
2. 左メニュー「Workers & Pages」が表示されることを確認

### Step 1-2. D1 データベースを作成

1. 左メニュー **「Storage & Databases」→「D1 SQL Database」**
2. **「Create database」** をクリック
3. 名前: `animehubs-db`（任意だが後で使う）
4. ロケーション: `Auto` のまま → **「Create」**
5. 作成後、**「Database ID」** をメモ（例: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

### Step 1-3. Cloudflare Pages プロジェクトを作成

1. 左メニュー **「Workers & Pages」**
2. **「Create」→「Pages」→「Connect to Git」**
3. GitHub アカウントを連携 → リポジトリ `tomoyasu-sano/Animehubs` を選択
4. ビルド設定:
   ```
   Framework preset: Next.js
   Build command:    npm run build
   Build output:     .vercel/output  ← Cloudflare が自動設定
   ```
5. **「Save and Deploy」** は一旦クリックしない（環境変数設定後）

### Step 1-4. wrangler.toml の設定（Claude が作成後に確認するだけ）

Claude がコード修正後、`wrangler.toml` に以下が入ります（確認のみ）:
```toml
[[d1_databases]]
binding = "DB"
database_name = "animehubs-db"
database_id = "← Step1-2でメモしたID"
```

### Step 1-5. 環境変数を Cloudflare Pages に設定

Pages プロジェクト → **「Settings」→「Environment variables」** で以下を追加:

| 変数名 | 値 | 備考 |
|--------|-----|------|
| `RESEND_API_KEY` | `re_xxxx...` | Resend のAPIキー |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | 送信元メール |
| `JWT_SECRET` | ランダム文字列（32文字以上） | `openssl rand -hex 32` で生成 |
| `ADMIN_PASSWORD_HASH` | bcrypt ハッシュ | 下記コマンドで生成 |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Instagram URL | |

**ADMIN_PASSWORD_HASH の生成方法:**
```bash
node -e "console.log(require('bcryptjs').hashSync('あなたのパスワード', 10))"
```

### Step 1-6. カスタムドメインを設定

1. Pages プロジェクト → **「Custom domains」**
2. **「Set up a custom domain」**
3. Cloudflare で管理しているドメインを入力 → DNS は自動設定される

---

## Part 2：Claude がやること（コード移行）

### 移行対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `better-sqlite3` 削除、`@cloudflare/workers-types` 追加 |
| `wrangler.toml` | 新規作成（D1バインディング設定） |
| `drizzle.config.ts` | dialect を `sqlite` → D1対応に変更 |
| `src/lib/db/index.ts` | better-sqlite3接続 → D1クライアントに置き換え |
| `src/lib/db/queries.ts` | 非同期対応（better-sqlite3は同期、D1は非同期） |
| `src/lib/db/admin-queries.ts` | 同上 |
| `src/lib/db/reservation-queries.ts` | トランザクション処理をD1対応に修正 |
| `src/app/api/**` | DB呼び出しを async/await に統一 |
| `next.config.ts` | Cloudflare Next.js adapter 設定追加 |

### 主な移行ポイント

**before（better-sqlite3 / 同期）:**
```typescript
import Database from "better-sqlite3";
const db = new Database("./data/animehubs.db");
const products = db.prepare("SELECT * FROM products").all();
```

**after（D1 / 非同期）:**
```typescript
// D1 は env.DB 経由でアクセス（Cloudflare Workers binding）
import { drizzle } from "drizzle-orm/d1";
export function getDb(env: Env) {
  return drizzle(env.DB);
}
const products = await db.select().from(productsTable);
```

---

## Part 3：初回データ投入（あなたがやること）

コード移行後、Claude が以下のコマンドを用意します。

### ローカルからD1へマイグレーション実行

```bash
# wrangler のインストール（未インストールの場合）
npm install -g wrangler

# Cloudflare にログイン
wrangler login

# マイグレーションをD1に適用
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/0000_init.sql

# シードデータを投入
npx wrangler d1 execute animehubs-db --file=./src/lib/db/seed.sql
```

---

## Part 4：自動デプロイの仕組み

設定完了後、以下のフローで自動デプロイされます:

```
git push origin main
    ↓
GitHub webhook → Cloudflare Pages がトリガー
    ↓
npm run build（Cloudflare 側で実行）
    ↓
ビルド成功 → 本番 URL に自動反映
    ↓
プレビュー URL も自動生成（PRごと）
```

### ブランチ戦略

| ブランチ | デプロイ先 |
|---------|-----------|
| `main` | 本番（カスタムドメイン） |
| その他のブランチ / PR | プレビューURL（`xxx.pages.dev`） |

---

## Part 5：Claude Code による自動化

### GitHub push 後の確認

```bash
# デプロイ状況確認
npx wrangler pages deployment list --project-name animehubs

# D1のデータ確認
npx wrangler d1 execute animehubs-db --command="SELECT COUNT(*) FROM products"

# ログ確認
npx wrangler pages deployment tail --project-name animehubs
```

---

## トラブルシューティング

### ビルドエラー: `better-sqlite3 native module`
→ `package.json` から `better-sqlite3` が削除されているか確認

### D1 binding エラー: `env.DB is undefined`
→ `wrangler.toml` の `database_id` が正しいか確認
→ Pages の環境変数に DB binding が設定されているか確認

### 型エラー: `Cannot find name 'Env'`
→ `@cloudflare/workers-types` がインストールされているか確認

### トランザクションエラー
→ D1はトランザクション対応済みだが、`batch()` APIの使用が必要な場合あり

---

## 参照リンク

- [Cloudflare D1 公式ドキュメント](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages + Next.js](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Drizzle ORM + D1](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [wrangler CLI リファレンス](https://developers.cloudflare.com/workers/wrangler/commands/)
