# 商品写真 → 登録ワークフロー

## フロー概要

```
撮影 → Photoroom加工 → ローカル保存 → /product-register → 管理画面で登録
```

---

## Step 1: 撮影

### 共通設定

- 白い紙/布でシームレス背景
- 窓際の自然光 + 反対側にレフ板（白い紙）
- 露出を上げる: カメラアプリで被写体タップ → 太陽マークを上にスワイプ（Pixel 7a）

### 開封済み商品（ファイル名の目安）

| ファイル名 | 内容 |
|-----------|------|
| `front.jpg` | 正面 |
| `angle.jpg` | 斜め45度 |
| `detail.jpg` | 顔・ディテールアップ |
| `back.jpg` | 背面（必要に応じて） |
| `box.jpg` | 箱・パッケージ（あれば） |

### 未開封商品（ファイル名の目安）

| ファイル名 | 内容 |
|-----------|------|
| `front.jpg` | 箱の正面（パッケージアート） |
| `back.jpg` | 箱の裏面（商品情報） |
| `side.jpg` | 箱の側面（必要に応じて） |
| `seal.jpg` | 封印シール・未開封証拠 |
| `damage.jpg` | 箱の傷・凹み（あれば） |

※ ファイル名は目安。商品に応じて自由に増減してOK。Claudeがフォルダ内の全画像を読み取る。

## Step 2: Photoroom加工

- 背景除去 → 白背景に配置
- エクスポート: **最大解像度**で出力（1200x1200px以上推奨）
- 形式: JPEG または WebP

## Step 3: ローカル保存

```
~/Downloads/animehubs-products/
  ├── tanjiro01/
  ├── nezuko01/
  └── ...
```

- 商品ごとにフォルダを分ける
- ファイル名は自由（Claudeが全ファイルを読み取る）

## Step 4: `/product-register` を実行

### 呼び出し例

```
/product-register tanjiro01 16cm Banpresto 開封済み 箱あり美品 傷なし 台座付き
```

```
/product-register nezuko-figure 14cm SEGA 未開封
```

```
/product-register luffy-figure 18cm Banpresto 開封済み 箱なし 本体に小傷あり 台座付き
```

### 渡す情報

| 項目 | 必須 | 説明 |
|------|------|------|
| フォルダ名 | 必須 | `~/Downloads/animehubs-products/` 配下のフォルダ名 |
| 高さ | 必須 | cm単位（例: 16cm） |
| メーカー | 必須 | Banpresto / SEGA / Kotobukiya 等 |
| 開封状態 | 必須 | 開封済み / 未開封 |
| 箱の状態 | 任意 | 箱あり美品 / 箱あり傷あり / 箱なし（省略時: Claudeが画像から判定） |
| 本体の傷 | 任意 | 傷なし / 小傷あり / 説明（省略時: Claudeが画像から判定） |
| 付属品 | 任意 | 台座付き / パーツ付き 等（省略時: Claudeが画像から判定） |

シリーズ名・キャラ名・商品説明はClaudeが画像から自動判定する。

### スキルの出力内容

1. **画像評価**（背景・ピント・色味・構図・解像度 → 100点スコア）
2. **コピペ用テキスト**（Name EN/SV + Description EN/SV）

### Description に含める8項目

| # | 項目 | 例（EN） | 例（SV） |
|---|------|---------|---------|
| 1 | 開封状態 | Opened / Sealed (unopened) | Öppnad / Förseglad (oöppnad) |
| 2 | 箱の状態 | Box included, good condition | Kartong medföljer, bra skick |
| 3 | 商品説明 | 特徴を簡潔に | 特徴を簡潔に |
| 4 | 高さ | Approximately 16cm tall | Cirka 16 cm hög |
| 5 | メーカー | Banpresto | Banpresto |
| 6 | シリーズ名 | Demon Slayer | Demon Slayer |
| 7 | 本体の傷・汚れ | No visible damage | Inga synliga skador |
| 8 | 付属品 | Base included | Bas medföljer |

## Step 5: 管理画面で登録

1. `/admin/products/new` にアクセス
2. コピペ用テキストを各フィールドに貼り付け
3. Category / Condition / Price / Featured は管理画面で選択
4. 画像を管理画面にアップロード（ドラッグ&ドロップ可、最大5枚・各5MB）
5. 「Create Product」で保存
