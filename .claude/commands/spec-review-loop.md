---
description: 仕様書の第三者レビュー→修正を3ラウンド自動反復し、仕様の品質を高める。
---

# Spec Review Loop Command

仕様作成 → 第三者レビュー → 修正を自動で複数ラウンド繰り返し、仕様の品質を高める。

## Usage

`/spec-review-loop <仕様書ファイルパス>`

## 実行フロー

```
Round 1: spec-reviewer(レビュー) → 修正
Round 2: spec-reviewer(レビュー) → 修正
Round 3: spec-reviewer(最終レビュー)
→ 最終レポート生成
```

> **注意**: 仕様書の作成は呼び出し元（app-builder の Step 0-2）で @planner が行う。
> このコマンドはレビュー+修正のループのみを担当する。

## 詳細手順

### レビューラウンド（最大3回）

各ラウンドで以下を実行:

1. **@spec-reviewer** を起動（新しいコンテキストで独立レビュー）
   - 前ラウンドのレビュー結果は渡さない（バイアス防止）
   - 仕様書ファイルのみを読ませる
2. レビュー結果を `specs/YYYYMMDD_<feature-name>_review_N.md` に保存
3. 判定を確認:
   - **APPROVED** → 最終レポート生成へ（ループ終了）
   - **NEEDS REVISION / BLOCKED** → 修正フェーズへ

### 修正フェーズ

1. レビュー指摘事項を読む
2. **このコマンドの実行主体**が仕様書を修正する
   - app-builder が Agent ツールで委任した場合 → そのサブエージェントが修正を実行
   - 要件サマリー（`specs/*_requirements.md`）と仕様書を参照して修正判断が可能
   - CRITICAL は必ず修正
   - HIGH は可能な限り修正
   - MEDIUM/LOW は判断して対応
   - **spec-reviewer はレビューのみ。修正は一切行わない**
3. 修正内容をログに記録
4. 次のレビューラウンドへ

### 最終レポート生成

全ラウンド完了後、最終レポートを出力:

```markdown
# 仕様レビューループ結果

## タスク: <タスクの説明>
## 仕様書: <ファイルパス>

## ラウンドサマリー

| ラウンド | 判定 | CRITICAL | HIGH | MEDIUM | LOW |
|----------|------|----------|------|--------|-----|
| 1 | BLOCKED | 2 | 3 | 1 | 0 |
| 2 | NEEDS REVISION | 0 | 1 | 2 | 1 |
| 3 | APPROVED | 0 | 0 | 1 | 0 |

## 修正履歴
- Round 1→2: [修正内容の要約]
- Round 2→3: [修正内容の要約]

## 残存事項（MEDIUM/LOW で未対応のもの）
- [項目1]
- [項目2]

## 最終判定: APPROVED / NEEDS HUMAN REVIEW
```

## 早期終了条件

- Round 1 で APPROVED → 1回で終了（稀だが可能）
- Round 3 で BLOCKED → 人間にエスカレーション（無限ループ防止）

## 前提条件

このコマンドは `@spec-reviewer` や `@planner` をサブエージェントとして起動します。
呼び出し元（app-builder 等）が **Agent ツール**を持っている必要があります。

## 重要なルール

1. **各レビューラウンドは独立したサブエージェントで実行する** — 前回のレビュー結果を引き継がず、毎回フレッシュな視点で見る
2. **修正は呼び出し元エージェントが行う** — レビュアーはレビューのみ、修正はしない
3. **3ラウンドで打ち切り** — 無限ループを防ぐ。3ラウンド後もBLOCKEDなら人間に判断を委ねる
4. **Round 3 で LOW のみ残存の場合は APPROVED とする** — spec-reviewer の緩和条件に準拠
5. **全ラウンドのレビュー結果を保存** — 後から改善の経緯を追跡可能にする
6. **仕様書のみを対象とする** — コード変更は一切行わない

## 使用例

```
/spec-review-loop specs/20260323_user-auth_spec.md
```

```
/spec-review-loop specs/20260323_stripe-subscription_spec.md
```

## Arguments

$ARGUMENTS:
- `<spec-file-path>` - レビュー対象の仕様書ファイルパス（例: `specs/YYYYMMDD_<feature-name>_spec.md`）
