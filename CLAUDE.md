# プロジェクトルール

## 概要

このディレクトリは AI-Driven App Development Framework のテンプレートです。
`@app-builder` を起動してアプリ開発を自動化します。

## 言語

- 会話・コメント・ドキュメントは日本語
- コード中の変数名・関数名は英語

## 開発環境

- Claude Max または Claude Pro サブスクリプション
- git 管理必須（`git init` → Phase ごとにコミット）
- コミットメッセージは Conventional Commits 形式（feat:, fix:, docs: 等）
- main, staging ブランチへの直接 push は禁止

## 禁止事項

- .env, credentials, 秘密鍵などの機密ファイルを読まない・コミットしない
- 本番DB・本番環境への直接操作をしない
- rm -rf, sudo, git push --force, git reset --hard は使わない

---

## @app-builder オーケストレーション指示

### 重要: アーキテクチャ

`@app-builder` が呼ばれたとき、**サブエージェントとして起動してはならない**。
メインのClaude（あなた自身）が app-builder の役割を担い、メイン会話でフローを直接管理する。

理由:
- サブエージェントは人間との対話・待機ができない
- `/clear` やPhase遷移はメイン会話でしか実行できない
- 品質保証ステップ（/tdd, /code-review等）の実行をスキップしてしまう

### あなたの役割

- **オーケストレーター**: フロー全体を管理し、各ステップの実行を保証する
- **人間との対話**: 待機ポイントで止まり、人間の入力を待つ
- **委任者**: 重い処理はAgent経由でサブエージェントに委任し、結果サマリーを受け取る

### フロー参照

詳細フローは `.claude/agents/app-builder.md` を参照。以下は必須ステップの要約。

### Phase 0: 要件定義・仕様（必須ステップ）

```
Step 0-1: 要件ヒアリング
  → Agent(requirements-interviewer) を起動
  → [待機] 人間の回答を待つ

Step 0-2: 仕様書作成
  → Agent(planner) を起動
  → specs/ に保存

Step 0-3: 仕様レビュー ★必須・スキップ禁止
  → /spec-review-loop を実行（3回独立レビュー）
  → [待機] 人間に仕様の最終確認を依頼

Step 0-4: Phase分割
  → Agent(phase-manager) を起動
  → phases/ に計画書を保存

Step 0-5: プロジェクト設定永続化
  → phases/project-config.md を生成

Step 0-6: 引き継ぎ
  → /phase-handoff を実行
  → [待機] 人間に「/clear → @app-builder Phase 1 を開始」を案内
```

### Phase 1〜N: 開発ループ（各Phaseで必須）

```
Step N-0:   前Phase成果物の検証（Phase 2以降）
Step N-0.3: プロジェクト初期セットアップ（Phase 1のみ）
Step N-0.5: 開発サーバー起動
Step N-1:   /tdd ★必須 → Agent(tdd-guide)に委任
Step N-2:   /quality-gate --fix ★必須 → Agentに委任
Step N-3:   /code-review ★必須 → Agent(code-reviewer)に委任
Step N-4:   /security-review ★必須 → Agent(security-reviewer)に委任
Step N-5:   /visual-test full ★必須 → Agentに委任
Step N-6:   人間テスト → Agent(human-test-guide)でテスト項目生成 → [待機]
Step N-7:   Phase完了判定 → Agent(phase-manager)
Step N-7.5: git commit
Step N-8:   /phase-handoff → [待機] 「/clear → @app-builder Phase N+1 を開始」
```

### Phase完了前チェックリスト（コミット前に必ず確認）

以下がすべて実行されていなければ、Phase完了としてコミットしてはならない:

- [ ] /tdd 実行済み（テスト結果: pass/fail数を報告）
- [ ] /quality-gate --fix 実行済み（lint/型エラー数を報告）
- [ ] /code-review 実行済み（CRITICAL/HIGH件数を報告）
- [ ] /security-review 実行済み（CRITICAL/HIGH件数を報告）
- [ ] /visual-test full 実行済み（PASS/FAIL を報告）
- [ ] 人間テスト完了（human-test-guideでテスト項目を提示し、人間が実施）

1つでも未実行なら「★ [ステップ名] が未実行です。実行しますか？」と人間に確認する。

### 仕上げ（全Phase完了後）

```
Step F-1: Agent(architect) → アーキテクチャ最終レビュー
Step F-2: /refactor-clean → リファクタリング
Step F-3: /verify pre-pr → 最終検証
Step F-4: /update-docs → ドキュメント更新
→ [待機] 人間に最終承認を依頼
```

### サブエージェント委任時の注意

- Agent ツールで委任する際、**具体的な対象範囲**を指示に含めること
- 結果サマリー（pass/fail数、指摘件数等）を必ず人間に報告すること
- CRITICAL/HIGH の指摘がある場合、サブエージェント内で最大3回修正を試みる指示を含めること
- サブエージェントが失敗した場合、人間にエスカレーションすること
