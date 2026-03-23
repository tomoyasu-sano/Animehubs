---
description: Phase完了時のコンテキスト引き継ぎドキュメント生成と次Phase開始案内を行う。
---

# Phase Handoff Command

Phase完了時のコンテキスト引き継ぎとリセットを行う。

## Usage

`/phase-handoff [current-phase] [next-phase]`

## 目的

Phase間で `/clear` を実行する前に、次Phaseに必要な情報を引き継ぎドキュメントとして保存する。これにより:

- コンテキストウィンドウをリセットして品質を維持
- 必要な情報だけを次Phaseに引き継ぎ
- 不要な文脈（試行錯誤の履歴等）を切り捨て

## 実行手順

### Step 1: 現Phase の成果物を整理

1. **git status** — 未コミットの変更を確認
2. **変更ファイル一覧** — このPhaseで追加・変更したファイル
3. **テスト結果** — 単体テスト、画面テスト、パフォーマンスの結果
4. **人間テスト結果** — フィードバックがあれば含める
5. **未解決事項** — 残課題、既知バグ、TODO

### Step 2: 引き継ぎドキュメント生成

以下のフォーマットで `phases/phase-N_handoff.md` に保存:

```markdown
# Phase N → Phase N+1 引き継ぎ

## 生成日時: YYYY-MM-DD HH:MM

## Phase N 完了サマリー

### 実装した内容
- [機能/ファイルのリスト]

### テスト結果
| カテゴリ | 結果 |
|----------|------|
| 単体テスト | X/Y passed, Z% coverage |
| 機能的E2E | PASS/FAIL |
| 視覚的回帰 | PASS/FAIL |
| パフォーマンス | LCP: Xs, CLS: X |
| 人間テスト | PASS/FAIL |
| コードレビュー | PASS/FAIL |
| セキュリティ | PASS/FAIL |

### 未解決事項
- [次Phaseに影響する残課題]

### 技術的な判断メモ
- [後で「なぜこうしたか」が分からなくなりそうな判断]

---

## Phase N+1 指示

### 実装範囲
[Phase計画書から該当Phase の内容を転記]

### 前提条件
- Phase N の成果物: [主要ファイルパス]
- 依存関係: [Phase N+1 が依存するもの]

### 注意事項
- [Phase N で判明した、次Phase で気をつけるべきこと]

### 参照すべきファイル
- プロジェクト設定: phases/project-config.md
- 仕様書: [project-config.md の「仕様書一覧」を転記]
- Phase計画: phases/phase-N+1_plan.md
- テストレポート: [test-reports/ 配下の該当Phaseレポートパス]
- CLAUDE.md
```

### Step 3: 次Phase 開始用のプロンプトを生成

`/clear` 後に人間が入力するプロンプトを生成:

```
@app-builder Phase N+1 を開始
```

> **注意**: app-builder の「途中再開モード」が起動し、必要なファイルを自動で読み込む。
> 人間が手動でファイルを指定する必要はない。

### Step 4: ユーザーに案内

以下のメッセージを表示し、ユーザーの操作を待つ:

```
Phase N が完了しました。

次のステップ:
1. /clear でコンテキストをリセット
2. 以下を入力して Phase N+1 を開始:

@app-builder Phase N+1 を開始

引き継ぎドキュメント: phases/phase-N_handoff.md
```

## --final オプション時の差分

最終Phase（`--final`）の場合、以下が通常と異なる:

1. **引き継ぎドキュメントのタイトル**: 「Phase N → 仕上げ 引き継ぎ」
2. **Phase N+1 指示セクション**: 次Phaseの実装範囲ではなく、仕上げフローの指示を記載:
   - Step F-1: @architect によるアーキテクチャレビュー
   - Step F-2: /refactor-clean によるリファクタリング
   - Step F-3: /verify pre-pr による最終検証
   - Step F-4: /update-docs によるドキュメント更新
3. **ユーザーへの案内メッセージ**:
   ```
   全Phaseが完了しました。

   次のステップ:
   1. /clear でコンテキストをリセット
   2. 以下を入力して仕上げを開始:

   @app-builder 仕上げを開始

   引き継ぎドキュメント: phases/phase-N_handoff.md
   ```

## 引き継ぎに含めないもの

- デバッグの試行錯誤の履歴
- 却下された設計案
- 一時的なワークアラウンド（修正済みのもの）
- AIとの会話の文脈

## Arguments

$ARGUMENTS:
- `<current-phase>` - 完了したPhase番号（例: 1）
- `<next-phase>` - 次のPhase番号（例: 2）。省略時は current + 1
- `--skip-tests` - テスト結果の集計をスキップ（すでに /visual-test 済みの場合）
- `--final` - 最終Phaseの場合。次Phase指示の代わりに最終レビュー指示を生成
