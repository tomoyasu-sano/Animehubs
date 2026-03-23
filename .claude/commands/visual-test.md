---
description: 機能的E2E + 視覚的回帰 + パフォーマンスを一括実行する画面テストコマンド。
---

# Visual Test Command

視覚的回帰 + 機能的E2E + パフォーマンスを一括実行する画面テストコマンド。

## Usage

`/visual-test [scope] [options]`

## 実行フロー

3つのテストを順番に実行し、統合レポートを出力する。

## テスト対象の決定

テスト対象は以下の優先順で決定する:
1. `--pages` オプションで明示指定された場合 → そのページ
2. Phase計画書（`phases/phase-N_plan.md`）が存在する場合 → 「Phase完了時テスト」セクションのシナリオ・ページ一覧を使用
3. いずれもない場合 → プロジェクトのルート・主要ルートを自動検出

> **重要**: phase-manager が Phase計画書で「機能的E2Eシナリオ」「視覚的回帰の対象画面」「Lighthouse計測ページ」を定義しているため、Phase完了時テストではこれを正として参照すること。

### Step 1: 機能的E2E（Playwright MCP）

Playwright MCP Server を使い、Phase計画書に定義された画面フローを自動操作:

1. アクセシビリティツリーベースで画面要素を特定
2. ユーザー操作（クリック、入力、遷移）を実行
3. 各ステップでアサーション検証
4. 失敗したステップはスクリーンショット付きで報告

```
対象: ログイン→ダッシュボード→主要機能の操作フロー
判定: 全操作が期待通り完了するか
```

### Step 2: 視覚的回帰（Chrome 連携）

Claude Code Chrome 連携（beta）を使い、実ブラウザ上で視覚的な確認を行う:

1. 対象ページ一覧を順に開く（Chrome 連携経由で実ブラウザのタブを操作）
2. 各ページで以下を確認:
   - レイアウト崩れ（要素の重なり、はみ出し）
   - CSSずれ（余白、フォントサイズ、色の不一致）
   - レスポンシブ対応（ブラウザのウィンドウサイズ変更で確認）
   - コンポーネントの表示崩れ
3. 問題のある画面は GIF 録画で記録
4. コンソールエラーの有無も同時にチェック

```
対象: 主要ページ全画面
判定: 視覚的な異常がないか
```

**scope による使い分け:**
- `quick`: 主要ページのみ簡易チェック（軽量・開発中向け）
- `full`: 全ページ + レスポンシブ確認（Phase完了時向け）

**フォールバック（Chrome 連携が利用できない場合）:**

Chrome 連携が動作しない場合は、Playwright スクリーンショット + AI画像分析にフォールバック:
1. Playwright MCP の `browser_take_screenshot` でスクリーンショットを撮影
2. 各ページで Desktop / Tablet (768px) / Mobile (375px) のビューポートを切り替えて撮影
3. AI が画像を分析してレイアウト崩れ・CSSずれを検出

Playwright スクリーンショットも利用できない場合:
→ 人間に「目視確認をお願いします」と伝え、human-test-guide のテスト項目に視覚チェックを追加

### Step 3: パフォーマンス（Lighthouse）

Lighthouse でCore Web Vitals を計測:

1. 対象ページに対して Lighthouse 監査を実行
2. `phases/project-config.md` の「パフォーマンス閾値」セクションから基準値を読み取る。project-config.md が存在しない場合は以下のデフォルト値を使用:
   - **LCP** (Largest Contentful Paint): < 2.5s
   - **CLS** (Cumulative Layout Shift): < 0.1
   - **INP** (Interaction to Next Paint): < 200ms
   - **Performance スコア**: > 90
3. 閾値を下回った場合、改善提案を出力

```
対象: ユーザーが最初にアクセスするページ群
判定: Core Web Vitals が基準値を満たすか
```

**フォールバック（Lighthouse MCP が利用できない場合）:**

Lighthouse MCP Server が動作しない場合は、Bash で直接実行:

```bash
npx lighthouse <URL> --output json --output-path ./test-reports/lighthouse.json --chrome-flags="--headless --no-sandbox"
```

JSON 出力から各指標を読み取り、同じ基準で判定する。

## 統合レポート

```markdown
# 画面テスト結果

## 実行日時: YYYY-MM-DD HH:MM
## 対象: [Phase名 / ページ一覧]

## サマリー

| テスト | 結果 | 詳細 |
|--------|------|------|
| 機能的E2E | PASS/FAIL | X/Y シナリオ通過 |
| 視覚的回帰 | PASS/FAIL | X件の異常検出 |
| パフォーマンス | PASS/FAIL | LCP: Xs, CLS: X, Score: X |

## 総合判定: PASS / NEEDS FIX / BLOCKED

## 機能的E2E 詳細
[各シナリオの結果]

## 視覚的回帰 詳細
[異常検出された画面と具体的な問題]

## パフォーマンス 詳細
[各ページのLighthouseスコア]

## 改善提案
[検出された問題への具体的な修正提案]
```

## レポート保存

結果を `test-reports/YYYYMMDD_HHMM_phase-N_visual-test.md` に保存する。
同日に複数回実行しても上書きされないよう、時刻（HHMM）を含める。

## Arguments

$ARGUMENTS:
- `quick` - Visual QA Checkpoint のみ（開発中の軽量チェック）
- `full` - 3テスト全実行（Phase完了時、デフォルト）
- `e2e-only` - Playwright MCP のみ
- `visual-only` - 視覚的回帰のみ
- `perf-only` - Lighthouse のみ
- `--pages <urls>` - テスト対象ページを指定（カンマ区切り）
- `--mobile` - モバイルビューポートも含める
- `--save` - レポートをファイルに保存（デフォルトON）

## 前提条件

- Playwright MCP Server が設定済み
- Chrome + Claude in Chrome 拡張がインストール済み（視覚的回帰テスト用。なくても Playwright フォールバックで続行可）
- Lighthouse がインストール済み（`npm i -g lighthouse` または Lighthouse MCP）

## 夜間実行

Phase完了時の full テストは時間がかかるため、バックグラウンド実行を推奨:

```
/visual-test full --pages /login,/dashboard,/settings,/billing
```

寝る前に実行し、翌朝レポートを確認する運用が可能。
