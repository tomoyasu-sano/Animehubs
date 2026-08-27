# yuyu.is デザイン分析

> 分析日: 2026-04-06
> URL: https://www.yuyu.is/
> 目的: AnimeHubsサイトのデザイン改善の参考資料（パクリではなく参考）

---

## サイト概要

- 日本の抹茶をアイスランドから販売するEC
- プラットフォーム: Shopify (Atelierテーマ v3.3.1)
- コンセプト: ミニマリスト・プレミアム
- ターゲット: 高品質な日本茶を求めるアイスランド/北欧の消費者

---

## 1. カラースキーム

| 要素 | ライトモード | ダークモード |
|------|------------|------------|
| 背景 | `#FFFFFF` | `#000000` |
| テキスト | `#000000` | `#FFFFFF` |
| ボタン | 黒 → hover `#383838` | 白テキスト on ダーク |
| ボーダー | `#E6E6E6` | — |

- アクセントカラーに頼らず、**不透明度（5%〜90%）のバリエーション**で階調を表現
- 商品写真そのものが色を担い、UIは無彩色で統一

---

## 2. タイポグラフィ

| 用途 | フォント | ウェイト |
|------|---------|---------|
| 見出し | Newsreader（セリフ） | 200 / 700 |
| 本文 | Red Hat Text（サンセリフ） | 400 / 700 |

### Fluid Typography（clamp関数）

```css
H1: clamp(4.5rem, 12.0vw, 7.5rem)  /* ヒーロー用 */
H2: clamp(3.0rem, 7.2vw, 4.5rem)
H3: clamp(1.75rem, 4.8vw, 3.0rem)
本文: 0.75rem（レスポンシブ可変）
行間: 本文 1.2〜1.6、見出し 1.0〜1.25
```

**ポイント**: セリフ見出し × サンセリフ本文の組み合わせでプレミアム感と可読性を両立

---

## 3. ヒーローセクション

- **フルワイド背景画像**（3840px幅の高解像度写真）
- 抹茶の産地を想起させるビジュアル
- テキストオーバーレイ: `"Sourced directly from Japan to Iceland"`
- グラデーション: `linear-gradient(to top, rgb(0 0 0 / 0.5), transparent)` でテキスト可読性を確保
- CTAボタン: 「Shop now」
- ヘッダーが**透過モード**になり画像と一体化 → 没入型ファーストビュー

---

## 4. ナビゲーション

### ヘッダー
- テキストロゴ「yuyu」（画像ロゴではない）
- メニュー: Home / Shop / Contact（3項目のみ）
- カートアイコン（アイテム数表示付き）
- ヒーロー上で**透過ヘッダー**として機能

### モバイル
- ドロワー型メニュー（0.2sアニメーション）
- オーバーフロー時は「More」ドロップダウンに折りたたみ

---

## 5. 商品カード・グリッド

- グリッド: 4カラム（デスクトップ）→ 2カラム（モバイル）
- 画像アスペクト比: **1:1（正方形）**
- **デュアルイメージ**: ホバーで2枚目に切替
- 商品名 + 価格をカード下部に表示
- 「Bestseller」バッジ
- バリアントピッカー: スウォッチ型（18px）

---

## 6. アニメーション・トランジション

| プリセット | 時間 |
|-----------|------|
| fast | 0.0625s |
| normal | 0.125s |
| slow | 0.2s |

- **View Transition API** によるページ遷移（フェード/スライド）
- スプリングアニメーション: 300ms
- 商品カードのホバーで画像切替
- イージング: `ease-out-cubic`, `ease-out-quad`, `ease-in-out-quad`

---

## 7. レスポンシブデザイン

| ブレークポイント | 変化 |
|----------------|------|
| 640px (40em) | セクション高さがビューポート単位に切替 |
| 960px (60em) | レイアウト調整 |
| 750px | バッジ/UI要素サイズ調整 |

- **Fluid Typography（clamp）** によりメディアクエリに依存しないサイズ変化
- スペーシングスケール係数: small=0.6、medium=0.7

---

## 8. スペーシング・余白

- コンテンツ幅: `42rem`（狭め → 周囲に大きな余白）
- ページ最大幅: `120rem`
- padding: `1rem`〜`4rem` のスケール
- gap: `1rem`〜`3rem`
- **余白の贅沢さがプレミアム感を演出**

---

## 9. ブランドストーリーテリング

- タグライン: 「Sourced directly from Japan to Iceland」
- 装飾記号 `𓏸𓐍` をアクセントに使用
- 「months of searching and meeting producers who honor true craftsmanship」
- 「The matcha we wanted you to taste first」— キュレーション型ブランド
- ミニマルな色使いとセリフ体が茶文化のプレミアム感を演出

---

## 10. トラストシグナル

| 種類 | 有無 |
|------|------|
| ベストセラーバッジ | あり |
| ユーザーレビュー | なし |
| 認証マーク | なし |
| 産地直送の訴求 | あり（ストーリーで補完） |
| SNSリンク | Facebook + Instagram |
| ニュースレター | フッターにメール登録フォーム |

---

## 11. フッター

- 著作権表示、Shopifyクレジット
- ポリシーリンク（Privacy policy, Terms of service）
- ニュースレター登録フォーム（控えめ）
- SNSアイコン（Facebook, Instagram）

---

## 12. 技術スタック

| 要素 | 詳細 |
|------|------|
| EC基盤 | Shopify |
| テーマ | Atelier v3.3.1 |
| フォント | Google Fonts (Red Hat Text, Newsreader) |
| セキュリティ | hCaptcha |
| 決済 | Shopify Payment Buttons |
| パフォーマンス | CDN画像リサイズ、遅延読み込み、View Transition API |

---

## AnimeHubsへの反映ポイント

### 高優先度

| 施策 | 内容 | 理由 |
|------|------|------|
| ヒーロー画像導入 | Gemini生成画像 + グラデーションオーバーレイ + 透過ヘッダー | 現状グラデーション背景のみ。没入感が段違いに変わる |
| 余白・スペーシング拡大 | セクション間の間隔を増やす | プレミアム感の演出に直結 |

### 中優先度

| 施策 | 内容 | 理由 |
|------|------|------|
| デュアルイメージホバー | 商品カードにホバー時2枚目画像切替 | フィギュアは正面→背面で特に効果的 |
| タイポグラフィ改善 | 見出しにセリフ系フォント、`clamp()`でFluid化 | 単一フォント(Inter)からの差別化 |

### 低優先度

| 施策 | 内容 | 理由 |
|------|------|------|
| バナーの控えめ化 | ニュースレターバナーをトーンダウン or フッター移動 | バイオレットバナーがやや強い |
| 色パレット整理 | UIの色数を減らし商品写真を引き立てる | 商品が主役になる |

---

## Geminiヒーロー画像生成プロンプト案

### 素材について
- 自分の未開封フィギュア箱を横に並べた写真を素材として使用
- Geminiに素材写真を渡し、背景・ライティング・雰囲気を加工させる

### プロンプト（英語） — Geminiに素材写真と一緒に渡す

#### プロンプトA: ショーケース・プレミアム路線

```
Transform this photo of sealed anime figure boxes into a premium e-commerce hero banner.

Requirements:
- Aspect ratio: 16:9, wide cinematic composition
- Keep the original boxes clearly visible and recognizable — do not alter the products
- Extend and enhance the background into a sleek, modern retail shelf or showcase display
- Lighting: soft, warm accent spotlights from above, with subtle rim lighting on the boxes
- Background: dark gradient (charcoal to near-black) that fades toward the edges, suitable for white text overlay on the left or right side
- Leave clear negative space on one side (left preferred) for headline text overlay
- Mood: premium collector's shop, curated and exclusive
- Color grading: slightly desaturated with warm highlights, cinematic tone
- Style: high-end product photography, editorial magazine quality
- No text, watermarks, or logos in the output
```

#### プロンプトB: コレクター部屋・雰囲気重視路線

```
Using this photo of sealed anime figure boxes as the centerpiece, create a wide hero banner image for an anime collectibles online store.

Requirements:
- Aspect ratio: 16:9, ultra-wide composition
- Preserve the original boxes exactly as they are — no modifications to the products
- Place the boxes on a dark wooden shelf or matte black display surface
- Add subtle depth: a blurred background suggesting more shelves with collectibles (bokeh effect)
- Lighting: dramatic side lighting with soft warm tones, like a collector's display room at night
- Dark overall tone — the image will have white/light text overlaid on it
- Reserve generous empty space on the left third of the image for text placement
- Atmosphere: intimate, passionate collector's space — not a sterile store
- Color palette: deep blacks, warm amber accents, hints of cool blue
- No AI-generated text, no watermarks
```

#### プロンプトC: クリーン・モダン路線（yuyu.isに最も近い）

```
Edit this photo of sealed anime figure boxes into a clean, minimalist hero banner for a premium online store.

Requirements:
- Aspect ratio: 16:9 wide format
- Keep all original boxes intact and unmodified
- Replace/extend background with a smooth, dark gradient (from #1a1a1a to #000000)
- Arrange visual weight toward the right side, leaving the left 40% mostly dark for text overlay
- Lighting: clean, even studio lighting — no harsh shadows, subtle reflections on the surface below
- Surface: glossy dark surface with soft reflections of the boxes
- Style: Apple-style product photography — clean, minimal, premium
- Depth of field: slightly shallow — sharp focus on front boxes, gentle blur on back
- No text, logos, or watermarks
- Output resolution: as high as possible
```

### 使い方
1. フィギュア箱を横に並べた写真を撮影（自然光 or 室内照明OK）
2. Geminiに写真をアップロードし、上記プロンプトのいずれかを貼り付け
3. 気に入った路線で何度か調整（「make it darker」「more space on the left」等）
4. 最終出力を `/public/images/hero/` に配置

### 注意点
- 箱のブランド・キャラクター名が読める程度の解像度を維持すること
- テキストオーバーレイ領域（左側40%程度）を確保すること
- 最終的にサイトでは `linear-gradient(to top, rgba(0,0,0,0.5), transparent)` を追加CSSで重ねる

---

## ライフスタイル画像生成プロンプト

### コンセプト

フィギュアをスウェーデンの日常空間に自然に溶け込ませる「ライフスタイル画像」シリーズ。
目的: 「こんなところに置くとおしゃれ」というイメージを伝え、スウェーデンの文化にアニメフィギュアが自然に浸透していく世界観を作る。

### 用途
- トップページのショーケースセクション（ヒーロー画像の下、2分割の右側）
- 将来的にSNS投稿、商品ページのイメージカットにも展開可能

### プロンプトテンプレート（Geminiにフィギュア写真と一緒に渡す）

#### A: 窓際シェルフ（スウェーデン・ヒュッゲ）

```
Place this anime figure sitting on a natural oak floating shelf next to a Scandinavian window.

Scene requirements:
- The figure is sitting casually on the shelf, leaning slightly
- Next to the figure: a small potted monstera or pilea plant in a ceramic pot, and a lit tealight candle in a clear glass holder
- Window: tall Swedish-style window with thin white frames, soft diffused daylight coming through
- Wall: clean matte white
- Shelf: light oak wood, minimal floating design
- The figure should cast a soft, natural shadow on the shelf
- Atmosphere: hygge, warm, lived-in but minimal — like a real Swedish apartment in autumn
- Color palette: warm whites, natural wood tones, soft greens from the plant
- Photography style: shallow depth of field, focus on the figure, background slightly blurred
- Lighting: golden hour natural light from the window, warm and gentle
- Shot angle: eye-level, slightly angled — as if you spotted it while walking past
- Aspect ratio: 3:1 wide (horizontal banner format for website section)
- No text, no watermarks, photorealistic quality
```

#### B: デスク周り（ワークスペース）— 今後用

```
Place this anime figure on a clean Scandinavian desk setup.

Scene requirements:
- The figure stands on a light birch wood desk
- Surroundings: a closed MacBook, a small succulent in a white ceramic pot, a brass desk lamp (off)
- Background: white wall with a single framed minimal art print
- Lighting: soft natural light from a nearby window, no harsh shadows
- Atmosphere: productive, calm, modern Scandinavian workspace
- Photography style: lifestyle product shot, shallow depth of field
- Color palette: whites, light wood, subtle brass accents
- Aspect ratio: 3:1 wide or 1:1 square
- No text, no watermarks, photorealistic quality
```

#### C: 本棚の隙間（コージー）— 今後用

```
Place this anime figure on a wooden bookshelf between books.

Scene requirements:
- The figure stands between a few leaning paperback books and a small potted ivy
- Shelf: natural pine or oak, part of a larger bookcase
- Other items nearby: a small candle, a ceramic cup, dried flowers
- Background: softly blurred remaining shelves with books
- Lighting: warm ambient indoor light, like a reading nook in winter
- Atmosphere: cozy, intellectual, Scandinavian hygge
- Photography style: close-up lifestyle shot, bokeh background
- Color palette: warm earth tones, cream, forest green
- Aspect ratio: 1:1 square
- No text, no watermarks, photorealistic quality
```

### 使い方
1. フィギュア写真（台座なし、白背景推奨）をGeminiにアップロード
2. 上記プロンプトのいずれかを貼り付け
3. ポーズに応じてプロンプトを微調整（立ちポーズ→「stands on」、座りポーズ→「sitting on」）
4. アスペクト比はサイト用途に合わせて変更（3:1バナー、1:1正方形、16:9ワイド）
5. 最終出力を `/public/images/showcase/` に配置

### 台座を消すプロンプト（前処理用）

```
Remove the black circular base/stand from this anime figure photo. Keep the figure itself completely intact and unmodified. Replace the base area with a clean white background that matches the rest of the image background. The result should look like the figure is floating on a pure white background with no stand or shadow from the stand visible. Output as PNG with transparent or white background.
```

---

## AnimeHubs現状との比較

| 要素 | yuyu.is | AnimeHubs現状 |
|------|---------|-------------|
| ヒーロー | フルワイド写真 + 透過ヘッダー | グラデーション背景のみ |
| フォント | セリフ + サンセリフ二層 | Inter単一 |
| 商品カード画像 | デュアルイメージ（ホバー切替） | シングルイメージ（ホバーでスケール） |
| 商品グリッド | 4列 | 3列 |
| 色パレット | 無彩色（黒白グレー） | ダークUI + バイオレットアクセント |
| 余白 | 贅沢（コンテンツ幅42rem） | やや密集 |
| ニュースレター | フッターに控えめ配置 | トップにバイオレットバナー |
| アニメーション | View Transition API + スプリング | 基本的なhover/transition |
| タイポグラフィ | Fluid (clamp) | 固定ブレークポイント |
