# 開発ワークフロー

## 日常の開発フロー

```
1. mainを最新にする
2. 作業ブランチを作成
3. コード修正・コミット
4. プッシュ
5. Pull Request を作成
6. mainにマージ
```

### 1. mainを最新にする

```bash
git checkout main
git pull origin main
```

### 2. 作業ブランチを作成

```bash
git checkout -b feature/作業内容
```

### 3. コード修正・コミット

```bash
git add <変更ファイル>
git commit -m "feat: 変更内容の説明"
```

> `git add .` ではなく、変更したファイルを個別に指定することを推奨。

### 4. プッシュ

```bash
git push -u origin feature/作業内容
```

### 5. Pull Request を作成

- GitHub 上で「Compare & pull request」ボタンをクリック
- base: `main` ← compare: `feature/作業内容` になっていることを確認
- タイトル・説明を記入して「Create pull request」

### 6. mainにマージ

- PR画面で「Merge pull request」→「Confirm merge」
- **承認（Approve）は不要** — 各自の判断でマージしてよい
- マージ後、リモートのブランチは削除してOK

### 7. ローカルを整理

```bash
git checkout main
git pull origin main
git branch -d feature/作業内容
```

## コンフリクトが発生したら

作業ブランチで main の最新を取り込んで解消する。

```bash
git checkout feature/作業内容
git pull origin main
# コンフリクトを手動で解消
git add <解消したファイル>
git commit -m "fix: mainとのコンフリクトを解消"
git push
```

## 本番デプロイ

mainにマージされると Vercel が自動デプロイする。
マージ前に以下を確認すること：

- [ ] `npm run build` がローカルで通る
- [ ] 変更箇所の動作確認済み
- [ ] 不要なconsole.logが残っていない
