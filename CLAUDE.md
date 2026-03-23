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
