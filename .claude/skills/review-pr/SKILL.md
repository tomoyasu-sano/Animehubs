---
name: review-pr
description: |
  GitHub PRの差分をレビューし、内容要約・問題点・マージ可否を日本語で報告する。
  Use when user says "PR見て", "PRレビュー", "プルリク確認", "review PR",
  "このPR見て", "PR check", "マージしていい？".
  Do NOT use for local code review (use code-review skill instead).
metadata:
  author: tomoyasu
  version: 1.0.0
---

# PR Review

## Critical Rules
- コードの変更は一切しない。レビュー報告のみ
- PRのURLまたは番号が必須。なければユーザーに確認して停止
- マージ判断は「マージOK / 要修正」の2択で明確に伝える

## Arguments
- `<PR URL or number>` — PR の GitHub URL（例: https://github.com/owner/repo/pull/10）または PR 番号（例: #10, 10）

## Instructions

### Step 1: PR情報を取得
1. 引数からPR URLまたは番号を特定する
2. `gh pr view <number> --json title,body,author,files,additions,deletions` でPR概要を取得
3. `gh pr diff <number>` で変更差分を取得
4. 差分が大きい場合はファイルごとに分割して読む

### Step 2: 変更内容を要約
- 何が変わったかを日本語で箇条書きにまとめる
- 変更ファイル一覧と各ファイルの変更概要を記載
- 技術的な知識がなくても判断できるよう平易に書く

### Step 3: 問題点チェック
以下の観点でチェックする：

**致命的（1つでもあれば要修正）**
- 既存機能を壊す変更
- セキュリティリスク（秘密情報のハードコード、XSS、SQLインジェクション等）
- ビルドが通らなくなる変更

**注意（軽微だがフィードバック推奨）**
- 不要なファイルの混入（console.log、デバッグコード等）
- スタイルの一貫性の問題
- パフォーマンスへの影響

### Step 4: マージ判断と報告

```
## PR レビュー: #<number> <title>

### 変更概要
- （箇条書きで要約）

### 変更ファイル
| ファイル | 変更内容 |
|----------|----------|
| path/to/file | 何をしたか |

### 問題点
**致命的:** なし / あり（詳細）
**注意:** なし / あり（詳細）

### 判定: ✅ マージOK / ❌ 要修正

### コメント
（補足があれば）
```

- 問題なし → 「✅ マージOK」と報告して停止
- 致命的あり → 「❌ 要修正」と報告し、相手へのフィードバック案を提示
- 注意のみ → 「✅ マージOK（注意点あり）」と報告し、注意点を記載
