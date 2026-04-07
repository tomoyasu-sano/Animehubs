# プロジェクトルール（チーム共通）

## 概要

AnimeHubs — アニメフィギュア EC サイト（Next.js + Cloudflare Pages）

## 言語

- 会話・コメント・ドキュメントは日本語
- コード中の変数名・関数名は英語

## ブランチ運用ルール

- `main` への直接 push は禁止（GitHub Rulesets で強制）
- すべての変更は作業ブランチを作成し、Pull Request 経由で main にマージする
- ブランチ名: `feature/`, `fix/`, `refactor/`, `docs/` のプレフィックスを付ける
- main への PR マージは GitHub 上で人間が手動で行う
- 詳細は `docs/collaboration/` を参照

## コンフリクト防止ルール

- 作業前に必ず `git pull origin main` で最新を取得する
- ブランチは短命にする（1-2日でマージ）
- 大きな変更は分割して小さなPRにする
- 共通ファイル（`globals.css`, `layout.tsx` 等）を触る場合は事前に相手に伝える
- 同じページを同時に触らない — 作業範囲を事前に共有する

## コミットメッセージ

Conventional Commits 形式（`feat:`, `fix:`, `refactor:`, `docs:` 等）

## 禁止事項

- `.env`, credentials, 秘密鍵などの機密ファイルを読まない・コミットしない
- 本番DB・本番環境への直接操作をしない
- `rm -rf`, `sudo`, `git push --force`, `git reset --hard` は使わない

## 個人設定

各開発者の個人的な Claude 設定は `.claude/CLAUDE.md`（gitignore対象）に記載する。
このファイル（`CLAUDE.md`）はチーム共通ルールのみ。
