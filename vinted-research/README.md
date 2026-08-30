# vinted-research — Vinted 市場定点観測ツール

日本関連商品が Vinted（ヨーロッパ市場）で「何が・いくらで・どのくらいの速さで」
売れるかをデータ収集・分析する。日本の中古ショップからの仕入れ判断に使う。

分析レポート・戦略メモは `~/tomo_inc/products/AnimeHubs/vinted-research/` に置く
（このディレクトリはコードと生データのみ）。

## 仕組み

1. **収集**（毎朝 9:00 + 0〜25分ジッター、launchd）
   `config.json` の各検索（キーワード × カテゴリ）を新着順で最大20ページ取得し、
   SQLite（`data/vinted.db`）に保存。新規商品はサムネイル画像も `data/images/` に保存。
2. **消滅検出（売れた推定）** — 追加リクエストゼロ
   各検索の窓（新着960件）にまだ残っているはずの若い商品が今日の収集に
   現れなかったら `gone` にする。最後に観測したいいね数で分類:
   いいね≥1 → 売れた可能性が高い / いいね0 → 不明（取り下げ等と区別つかず）。
3. **売却チェック（個別ページ、`--sold-check` で手動実行のみ）**
   2週間後の本格分析の前に、gone 商品のサンプルと注目商品の個別ページを確認し、
   JSON-LD の availability（InStock/SoldOut/404）で上記推定の精度を検証・補強する。
   毎日は実行しない（リクエスト数を抑え Ban リスクを避けるため）。
4. **分析**(2週間後に本格実施)
   いいね数の推移 × 売却速度 × 価格帯で「仕入れるべきもの」をランキング。

## 使い方

```bash
python3 collect.py              # 手動で今すぐ収集
python3 collect.py --no-images  # 画像DLなし
python3 report.py               # 収集状況・売却判定のクイック確認
```

## 定期実行（launchd）

```bash
cp com.animehubs.vinted-research.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.animehubs.vinted-research.plist
# 解除するとき
launchctl bootout gui/$(id -u)/com.animehubs.vinted-research
```

- Mac がスリープ中に 7:00 を過ぎた場合、**次に起きたときに1回実行**される
- Mac の電源が切れていた日はスキップされる（データに1日穴が開くだけで問題なし）
- ログ: `data/launchd.log`

## 設計メモ・制約

- アクセスは**匿名セッション**（販売アカウントとは無関係）。curl 使用は TLS
  フィンガープリントの観点で意図的（Python requests に変えないこと）
- リクエスト間隔はランダム化済み。`max_pages` × 検索本数を増やしすぎない
  （現在: 8検索 × 20ページ + 売却チェック最大600件/日）
- カタログ検索 API は 1 検索あたり **960 件（20ページ）が上限**。それより古い商品は
  検索窓から自然に押し出されるため、「検索結果から消えた」こと自体は売却の証拠に
  ならない。**窓の下限（その日見えた最古の出品時刻）より新しいのに消えた**場合のみ
  gone と判定する（db.mark_gone、2時間マージン付き）
- 出品日時は非公開のため、メイン写真のアップロード時刻
  （`photo.high_resolution.timestamp`）を近似値として使用
- カテゴリ ID: Hobbies & collectables=4824, Kids>Toys=1499,
  Books & Media=2309, Home=1918, Video games & consoles=3002。
  全カテゴリ一覧は `~/tomo_inc/products/AnimeHubs/vinted-research/categories.md`
