# 開発ワークフロー備忘録

## ローカル開発

### 起動コマンド

```bash
# 1. ビルド（コード変更のたびに必要）
npm run build:cf

# 2. 起動（ポート 8787）
npm run dev:cf
```

http://localhost:8787 で確認。

### 用途別の使い分け

| 目的 | コマンド | 特徴 |
|------|---------|------|
| UI調整・フロント開発 | `npm run dev` | HMR有り・速い。DBアクセスはエラーになる |
| DB含む動作確認 | `npm run build:cf && npm run dev:cf` | 本番と同じ動作 |

---

## 本番デプロイ

```bash
git push origin main
```

GitHub push → Cloudflare Pages が自動ビルド＆デプロイ。特別な操作不要。

---

## DBスキーマを変更した場合

スキーマ変更（テーブル追加・カラム変更など）は**ローカルと本番を別々に適用**する必要がある。

### 手順

**1. マイグレーションファイルを作成**

```bash
npm run db:generate
# → src/lib/db/migrations/ に新しい .sql ファイルが生成される
```

**2. ローカルD1に適用**

```bash
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/<ファイル名>.sql --local
```

**3. 本番D1に適用**

```bash
npx wrangler d1 execute animehubs-db --file=./src/lib/db/migrations/<ファイル名>.sql --remote
```

> ⚠️ `git push` してもDBは変わらない。本番DBへの適用は必ず手動で行うこと。

---

## ローカルD1の場所

`.wrangler/state/v3/d1/` 配下にSQLiteファイルとして保存される。
