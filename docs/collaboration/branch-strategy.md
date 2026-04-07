# ブランチ戦略

## ブランチ構成

```
main                  ← 本番（直接pushしない・PRのみ）
├── feature/xxx       ← 新機能
├── fix/xxx           ← バグ修正
└── refactor/xxx      ← リファクタリング
```

## ルール

- `main` への直接 push は禁止（GitHub Rulesets で強制）
- すべての変更は Pull Request 経由でマージする
- ブランチ名は `feature/`, `fix/`, `refactor/` のプレフィックスを付ける
- コミットメッセージは Conventional Commits 形式

## コミットメッセージ形式

```
<type>: <description>
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `docs` | ドキュメント |
| `test` | テスト |
| `chore` | 雑務（依存関係更新など） |

### 例

```bash
git commit -m "feat: 商品検索フィルターを追加"
git commit -m "fix: カート合計金額の計算ミスを修正"
```
