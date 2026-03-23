# AI-Driven App Development Framework

Claude Code のサブスクリプションだけで、人間の介入を最小限にしたアプリ開発を実現するフレームワーク。

## コンセプト

- **人間は `@app-builder` を起動するだけ** — 要件の質問に答え、仕様を確認し、人間テストを実施するだけでアプリが完成する
- **品質は AI が担保** — 仕様の3回独立レビュー、TDD、コードレビュー、セキュリティレビュー、画面テストを全自動で実行
- **追加課金ゼロ** — Claude Code サブスク + 無料 OSS ツール（Playwright MCP, Lighthouse MCP）+ Chrome 連携（beta）のみ
- **このディレクトリで完結** — 外部リポジトリへの依存なし。必要なエージェント・コマンドはすべて `.claude/` 配下に同梱済み

## ディレクトリ構成

```
.claude/
  agents/
    app-builder.md              # 全体オーケストレーター（これだけ起動すればOK）
    requirements-interviewer.md # 質問型で要件を詰める
    spec-reviewer.md            # 仕様書の第三者レビュー（3回独立実行）
    phase-manager.md            # Phase分割・テスト計画・完了判定
    human-test-guide.md         # 人間テスト項目リスト生成
    planner.md                  # 仕様書作成
    architect.md                # アーキテクチャレビュー
    code-reviewer.md            # コード品質チェック
    security-reviewer.md        # セキュリティ脆弱性チェック
    tdd-guide.md                # TDD実装ガイド
    refactor-cleaner.md         # リファクタリング
  commands/
    spec-review-loop.md         # 仕様レビュー自動3ラウンドループ
    visual-test.md              # 画面テスト一括実行（E2E+視覚+パフォーマンス）
    phase-handoff.md            # Phase間の引き継ぎ+コンテキストリセット
    tdd.md                      # TDD実装
    code-review.md              # コードレビュー
    verify.md                   # ビルド・テスト検証
    quality-gate.md             # フォーマッタ・リンター
    security-review.md          # セキュリティレビュー
    refactor-clean.md           # リファクタリング
    update-docs.md              # ドキュメント更新
```

## 開発フロー全体図

```
人間: 「@app-builder ○○アプリを作りたい」
  │
  ▼
起動時チェック
  └─ 依存リソース存在確認 ──── 不足なら停止・案内
  │
  ▼
Phase 0: 要件定義・仕様
  ├─ requirements-interviewer ── 質問で要件を詰める [人間: 回答]
  ├─ planner ──────────────── 仕様書を作成
  ├─ spec-review-loop ─────── 3回独立レビュー+修正
  │   └─ spec-reviewer × 3回（毎回新コンテキスト、独立サブエージェント）
  ├─ [人間: 仕様の最終確認 + 人間判断項目に回答]
  ├─ phase-manager ─────────── Phase分割・テスト計画
  ├─ project-config生成 ────── レビュアー・仕様書一覧を永続化
  └─ /phase-handoff ────────── 引き継ぎ → [人間: /clear → @app-builder Phase 1 を開始]
  │
  ▼
Phase 1〜N: 開発ループ（Phaseごと繰り返し）
  ├─ project-config読込 ────── レビュアー設定を復元
  ├─ 前Phase成果物検証 ─────── 依存ファイル・テスト結果の存在確認
  ├─ 開発サーバー起動 ────── Claude Code が自動起動
  ├─ /tdd ──────────────────── TDD実装（単体テスト80%+）
  ├─ /quality-gate --fix ──── フォーマッタ・リンター自動修正
  ├─ /code-review ─────────── コードレビュー
  ├─ /security-review ─────── セキュリティチェック
  ├─ /visual-test full ────── 画面テスト一括
  │   ├─ Playwright MCP ────── 機能的E2E
  │   ├─ Chrome 連携 ────────── 視覚的回帰（CSSずれ、レイアウト）実ブラウザ確認
  │   └─ Lighthouse MCP ───── パフォーマンス（CLS, LCP）※フォールバックあり
  ├─ human-test-guide ─────── 人間テスト項目提示
  ├─ [人間: テスト実施・結果報告]（3回NGなら選択肢提示）
  ├─ phase-manager ─────────── Phase完了判定
  ├─ git commit ────────────── コミット（Conventional Commits形式）
  └─ /phase-handoff ────────── 引き継ぎ → [人間: /clear → @app-builder Phase N+1 を開始]
  │
  ▼
最終: 仕上げ
  ├─ architect ─────────────── アーキテクチャ最終レビュー（構造問題の修正方針決定）
  ├─ /refactor-clean ───────── リファクタリング（architect指摘含む）
  ├─ /verify pre-pr ────────── 全チェック最終検証（リファクタ後の再確認）
  ├─ /update-docs ──────────── ドキュメント更新
  └─ [人間: 最終承認]
```

## 人間が操作するタイミング（全6種類）

| # | いつ | 何をする | 目安時間 |
|---|------|---------|----------|
| 1 | 要件ヒアリング | 質問に回答（複数往復OK） | 30〜60分 |
| 2 | 仕様最終確認 | 仕様書を読む+人間判断項目に回答 | 15〜30分 |
| 3 | Phase 0 → 1 切替 | `/clear` → `@app-builder Phase 1 を開始` | 1分 |
| 4 | 人間テスト（各Phase） | テスト項目を実施して結果報告 | 15〜30分 |
| 5 | Phase切替（各Phase） | `/clear` → `@app-builder Phase N+1 を開始` | 1分 |
| 6 | 最終承認 | 成果物確認 | 15分 |

それ以外はすべて AI が自動実行する。

## テスト戦略

```
テスト
 ├─ 1. 単体テスト ─────────── TDDでカバー（機能ごと）
 └─ 画面テスト
     ├─ 2a. 機能的E2E ────── Playwright MCP（操作フロー検証）
     ├─ 2b. 視覚的回帰 ───── Chrome 連携（実ブラウザで視覚確認、GIF録画対応）
     ├─ 2c. パフォーマンス ── Lighthouse MCP（CLS, LCP, スコア）
     └─ 3. 人間テスト ────── 課金フロー、デザインの雰囲気、探索的テスト
```

- 単体テスト: 機能ごとに /tdd で実施
- 画面テスト 2a〜2c: Phase完了時に /visual-test full で一括実行
- 人間テスト 3: human-test-guide が項目リストを生成、人間が実施

> 視覚的回帰テスト（2b）は Claude Code Chrome 連携（beta）で実施。実ブラウザ上で視覚確認・GIF録画が可能。
> Chrome 連携が動作しない場合は Playwright スクリーンショット + AI画像分析にフォールバック。

## 開発環境

- git 管理必須（`git init` → Phase ごとにコミット、Conventional Commits 形式）
- main, staging ブランチへの直接 push は禁止
- デプロイは別PCから行うケースにも対応（ローカルでは commit まで、push/deploy は別環境で実施可）

## 使用ツール

| ツール | 用途 | 料金 |
|--------|------|------|
| Claude Code (Max サブスク) | AI エージェント全般 | サブスク内 |
| Playwright MCP Server | 機能的E2Eテスト | 無料 (OSS) |
| Lighthouse MCP | パフォーマンス計測 | 無料 (OSS) |
| Claude Code Chrome 連携 (beta) | 視覚的回帰テスト | サブスク内（Chrome 拡張必要） |

## リソース構成

すべてのリソースは `.claude/` 配下に同梱済み。外部リポジトリへの依存はない。

| 種別 | リソース | 目的 |
|------|---------|------|
| agent | app-builder | 全体オーケストレーター |
| agent | requirements-interviewer | 質問型要件定義 |
| agent | spec-reviewer | 仕様書第三者レビュー |
| agent | phase-manager | Phase管理・完了判定 |
| agent | human-test-guide | 人間テスト項目生成 |
| agent | planner | 仕様書作成 |
| agent | architect | アーキテクチャレビュー |
| agent | code-reviewer | コード品質チェック |
| agent | security-reviewer | セキュリティ脆弱性チェック |
| agent | tdd-guide | TDD実装ガイド |
| agent | refactor-cleaner | リファクタリング |
| cmd | /spec-review-loop | 仕様3回自動レビュー |
| cmd | /visual-test | 画面テスト一括実行 |
| cmd | /phase-handoff | Phase引き継ぎ+clear |
| cmd | /tdd | TDD実装 |
| cmd | /code-review | コードレビュー |
| cmd | /verify | ビルド・テスト検証 |
| cmd | /quality-gate | フォーマッタ・リンター |
| cmd | /security-review | セキュリティレビュー |
| cmd | /refactor-clean | リファクタリング |
| cmd | /update-docs | ドキュメント更新 |

## 出力ディレクトリ・命名規則

フレームワークが生成するファイルの保存先と命名規則:

```
プロジェクトルート/
  specs/
    YYYYMMDD_<feature-name>_requirements.md  # 要件サマリー
    YYYYMMDD_<feature-name>_spec.md          # 仕様書
    YYYYMMDD_<feature-name>_review_1.md      # レビュー結果（ラウンド1）
    YYYYMMDD_<feature-name>_review_2.md      # レビュー結果（ラウンド2）
    YYYYMMDD_<feature-name>_review_3.md      # レビュー結果（ラウンド3）
    YYYYMMDD_<feature-name>_change_N.md      # 追加仕様書（仕様変更時、Nはグローバル連番）
  phases/
    project-config.md                        # プロジェクト全体設定（レビュアー、仕様書一覧）
    phase-N_plan.md                          # Phase計画書
    phase-N_handoff.md                       # Phase引き継ぎドキュメント
  test-reports/
    YYYYMMDD_HHMM_phase-N_visual-test.md     # 画面テスト結果（時刻付きで重複回避）
```

## セットアップ

### Step 1: 前提条件の確認

- Claude Code（v2.0.73+）がインストール済み
- Claude Max または Claude Pro サブスクリプション
- Node.js がインストール済み
- Google Chrome + [Claude in Chrome 拡張](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)（v1.0.36+）— 視覚的回帰テスト用

> すべてのエージェント・コマンドは `.claude/` 配下に同梱済みのため、外部リポジトリからのコピーは不要です。

### Step 2: MCP サーバー設定

```bash
# Playwright MCP（機能的E2Eテスト）
# 公式: https://github.com/microsoft/playwright-mcp
claude mcp add playwright -- npx @playwright/mcp

# Lighthouse MCP（パフォーマンス計測）
# 公式: https://github.com/danielsogl/lighthouse-mcp-server
claude mcp add lighthouse -- npx lighthouse-mcp-server
```

### Step 3: Chrome 連携の確認（視覚的回帰テスト用）

```bash
# Chrome 連携を有効化して Claude Code を起動
claude --chrome

# セッション内で接続状態を確認
/chrome
```

> Chrome 連携が利用できない場合でも、Playwright スクリーンショット + AI画像分析にフォールバックするため開発は続行可能です。

### Step 4: 動作確認

```bash
# .claude/agents/ にエージェントが存在することを確認
ls .claude/agents/
# 期待: app-builder.md, requirements-interviewer.md, spec-reviewer.md,
#       phase-manager.md, human-test-guide.md, planner.md, architect.md,
#       code-reviewer.md, security-reviewer.md, tdd-guide.md, refactor-cleaner.md

# .claude/commands/ にコマンドが存在することを確認
ls .claude/commands/
# 期待: spec-review-loop.md, visual-test.md, phase-handoff.md,
#       tdd.md, code-review.md, verify.md, quality-gate.md,
#       security-review.md, refactor-clean.md, update-docs.md
```

## クイックスタート

```bash
# 1. セットアップ完了後、Claude Code を起動
claude

# 2. app-builder を起動
@app-builder ToDoアプリを作りたい

# 3. あとは質問に答えるだけ
```
