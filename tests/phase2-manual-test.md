# Phase 2 人間テストガイド（お気に入り機能）

推定テスト時間: 25〜30分

---

## 事前準備

### 1. テスト用商品データの投入

商品が0件なので、まずテストデータを投入する。

```bash
npx wrangler d1 execute animehubs-db --local --file=tests/phase2-seed-data.sql
```

投入確認:
```bash
npx wrangler d1 execute animehubs-db --local --command="SELECT id, name_en, stock, reserved_stock, likes_count FROM products"
```

期待される結果（6件）:

| id | name_en | stock | reserved_stock | likes_count |
|----|---------|-------|----------------|-------------|
| test-prod-001 | Rem - Re:Zero 1/7 Scale Figure | 10 | 0 | 5 |
| test-prod-002 | Nendoroid Miku Hatsune | 5 | 0 | 3 |
| test-prod-003 | Nezuko Kamado - Demon Slayer | 3 | 1 | 8 |
| test-prod-004 | Gojo Satoru - Jujutsu Kaisen | 2 | 0 | 12 |
| test-prod-005 | Zero Two - Darling in the Franxx | 0 | 0 | 20 |
| test-prod-006 | Levi Ackerman - Attack on Titan | 1 | 1 | 15 |

### 2. アプリのビルドと起動

```bash
npm run build:cf
npm run dev:cf
```

起動後、http://localhost:8787/en にアクセスできることを確認。

### 3. 環境変数の確認

`.dev.vars` に以下が設定されていること:
- `AUTH_SECRET` — 32文字以上のランダム文字列
- `AUTH_GOOGLE_ID` — Google Cloud ConsoleのクライアントID
- `AUTH_GOOGLE_SECRET` — Google Cloud Consoleのクライアントシークレット
- `AUTH_TRUST_HOST=true`
- `AUTH_URL=http://localhost:8787`

Google Cloud Consoleの「認証情報」で、リダイレクトURIに以下が両方登録されていること:
- `http://localhost:8787/api/auth/callback/google`
- `https://localhost:8787/api/auth/callback/google`

---

## テスト項目

### TEST-01: 商品一覧の表示と在庫バッジ（優先度: 高）

**目的**: テストデータが正しく表示され、在庫状態に応じたバッジが出るか

**手順**:
1. http://localhost:8787/en にアクセス
2. 商品一覧（Products）ページに移動

**確認項目**:
- [ ] 6件の商品カードが表示される
- [ ] 各商品に価格が「kr 1,899.00」のような形式で表示される
- [ ] 各商品カードの右上にハートボタン（白抜き）がある
- [ ] **test-prod-003**（Nezuko）のカード左上に「Only 2 left」のオレンジバッジが表示される
- [ ] **test-prod-004**（Gojo）のカード左上に「Only 2 left」のオレンジバッジが表示される
- [ ] **test-prod-005**（Zero Two）のカードに黒い半透明オーバーレイ + 「Out of Stock」が表示される
- [ ] **test-prod-006**（Levi）のカードに黒い半透明オーバーレイ + 「Out of Stock」が表示される（stock=1だがreserved=1で実質0）
- [ ] いいね数がハートボタンの横に表示される（例: Rem → 5、Gojo → 12）

---

### TEST-02: 未ログイン時のハートボタン → ログインリダイレクト（優先度: 高）

**目的**: 未認証ユーザーがお気に入り操作でログインページに誘導されるか

**事前条件**: ログアウト状態（初回アクセスなら未ログイン）

**手順**:
1. http://localhost:8787/en/products にアクセス
2. 任意の商品カードのハートボタン（右上）をクリック
3. リダイレクト先を確認

**確認項目**:
- [ ] ハートボタンをクリックすると、商品詳細ページではなくログインページに遷移する（stopPropagation確認）
- [ ] ブラウザのURLが `/en/auth/login?callbackUrl=...` になっている
- [ ] `callbackUrl` パラメータに元のパス（`%2Fen%2Fproducts` 等）が含まれている

---

### TEST-03: Google OAuth ログイン（優先度: 高）

**目的**: Google認証が正常に動作するか

**手順**:
1. TEST-02 のログインページから、Googleアカウントでログイン
2. Google認証画面でアカウントを選択

**確認項目**:
- [ ] Google認証画面が表示される
- [ ] 認証後、元のページ（callbackUrlの先）にリダイレクトされる
- [ ] ヘッダーにユーザー情報（名前やアバター）が表示される、またはログイン状態が確認できる

**トラブルシュート**:
- 「redirect_uri_mismatch」エラー → Google Cloud Consoleでリダイレクトuri確認
- 画面が真っ白 → ターミナルのエラーログを確認

---

### TEST-04: お気に入り追加（楽観的更新）（優先度: 高）

**目的**: ログイン状態でハートボタンが即座にUI反映されるか

**事前条件**: TEST-03 でログイン済み

**手順**:
1. http://localhost:8787/en/products にアクセス
2. **Rem**（test-prod-001）のハートボタンをクリック
3. UI変化を観察
4. ブラウザのDevTools → Network タブを開いて、もう1つの商品（**Miku**）のハートをクリック

**確認項目**:
- [ ] クリック直後にハートが赤く塗りつぶされる（遅延なし）
- [ ] いいね数が +1 される（Rem: 5→6）
- [ ] DevToolsのNetworkタブに `POST /api/favorites` リクエストが飛んでいる
- [ ] レスポンスが `201 Created` + `{"success":true}`

---

### TEST-05: お気に入り解除（楽観的更新）（優先度: 高）

**目的**: いいね解除が即座にUI反映されるか

**手順**:
1. TEST-04 でお気に入りにした **Rem** のハートボタンを再度クリック

**確認項目**:
- [ ] クリック直後にハートが白抜きに戻る（遅延なし）
- [ ] いいね数が -1 される（6→5に戻る）
- [ ] DevToolsのNetworkタブに `DELETE /api/favorites/test-prod-001` リクエストが飛んでいる
- [ ] レスポンスが `200 OK` + `{"success":true}`

---

### TEST-06: ページリロード後のお気に入り永続化（優先度: 高）

**目的**: DB永続化が機能しているか

**手順**:
1. **Miku**（test-prod-002）をお気に入りに追加（赤ハートになることを確認）
2. ブラウザで Cmd+R（またはF5）でページをリロード
3. **Miku** のハートの状態を確認

**確認項目**:
- [ ] リロード後も **Miku** のハートが赤いまま表示される
- [ ] 他の未お気に入りの商品は白ハートのまま

**追加確認（DB直接確認）**:
```bash
npx wrangler d1 execute animehubs-db --local --command="SELECT * FROM favorites"
```
- [ ] favoritesテーブルに自分のuser_idとtest-prod-002のレコードが存在する

```bash
npx wrangler d1 execute animehubs-db --local --command="SELECT id, likes_count FROM products WHERE id IN ('test-prod-001', 'test-prod-002')"
```
- [ ] test-prod-001 の likes_count が 5（追加→解除したので元に戻る）
- [ ] test-prod-002 の likes_count が 4（3→4に増加）

---

### TEST-07: お気に入り一覧ページ（優先度: 高）

**目的**: /favorites ページが正しく表示・操作できるか

**事前条件**: TEST-06 で **Miku** がお気に入り済み。さらに **Nezuko**（test-prod-003）と **Zero Two**（test-prod-005、在庫切れ）もお気に入りに追加しておく。

**準備**:
1. 商品一覧で **Nezuko** のハートをクリック（赤くなる）
2. 商品一覧で **Zero Two** のハートをクリック（赤くなる）

**手順**:
1. http://localhost:8787/en/favorites にアクセス

**確認項目**:
- [ ] ページタイトル「My Favorites」が表示される
- [ ] **Miku**、**Nezuko**、**Zero Two** の3件が表示される
- [ ] 各商品に商品名、価格、画像が正しく表示される
- [ ] **Zero Two** に「Out of Stock」オーバーレイが表示される
- [ ] **Zero Two** の「Add to Cart」ボタンがグレーアウト（無効化）されている
- [ ] **Zero Two** の「Add to Cart」ボタンをクリックしても何も起きない
- [ ] **Nezuko** に「Only 2 left」の表示がある
- [ ] **Miku** の「Add to Cart」ボタンは有効（青色等の通常色）

---

### TEST-08: お気に入り一覧からカートへ移動（優先度: 高）

**目的**: 「カートへ移動」ボタンが機能するか

**手順**:
1. TEST-07 の状態で、**Miku** の「Add to Cart」ボタンをクリック
2. ヘッダーのカートアイコンを確認

**確認項目**:
- [ ] カートアイコンにバッジ（数字 1）が表示される、またはカートに商品が追加される
- [ ] http://localhost:8787/en/cart にアクセスして **Miku** がカートに入っていることを確認

---

### TEST-09: お気に入り一覧でのいいね解除（優先度: 高）

**目的**: 一覧ページからのお気に入り解除が機能するか

**手順**:
1. お気に入り一覧ページで **Nezuko** のハートボタン（赤）をクリック

**確認項目**:
- [ ] **Nezuko** がリストから即座に消える
- [ ] 残りは **Miku** と **Zero Two** の2件
- [ ] ページをリロードしても **Nezuko** は表示されない

---

### TEST-10: お気に入り0件の空状態（優先度: 中）

**目的**: お気に入りが空の場合のUI表示

**手順**:
1. お気に入り一覧ページで残りの商品をすべてハートボタンで解除
2. 最後の1件を解除した後のUIを確認

**確認項目**:
- [ ] ハートアイコン + 「No favorites yet」メッセージが中央に表示される
- [ ] ページが壊れたり白画面にならない

---

### TEST-11: 連打テスト（優先度: 中）

**目的**: 高速操作でUIやDBが不整合にならないか

**手順**:
1. 商品一覧に戻る
2. 任意の商品のハートボタンを素早く10回以上連打する
3. DevToolsのNetworkタブでAPIリクエストを観察

**確認項目**:
- [ ] UIが壊れない（ハートが消えたり表示が崩れたりしない）
- [ ] 最終的にハートの状態が安定する（赤 or 白で確定する）
- [ ] Networkタブで409（重複）や404（存在しない）のレスポンスが出ても画面が壊れない

---

### TEST-12: 未ログインでお気に入り一覧ページアクセス（優先度: 中）

**目的**: 保護対象パスのミドルウェアが機能しているか

**手順**:
1. ログアウトする（またはシークレットウィンドウで開く）
2. ブラウザのアドレスバーに直接 `http://localhost:8787/en/favorites` を入力

**確認項目**:
- [ ] ログインページにリダイレクトされる
- [ ] URLに `callbackUrl` が含まれている

---

### TEST-13: スウェーデン語切り替え（優先度: 低）

**目的**: 多言語対応の確認

**手順**:
1. ログイン状態で http://localhost:8787/sv/products にアクセス
2. http://localhost:8787/sv/favorites にアクセス

**確認項目**:
- [ ] 商品名がスウェーデン語で表示される（例: 「Rem - Re:Zero 1/7 Skalfigur」）
- [ ] お気に入り一覧のタイトルが「Mina favoriter」
- [ ] ボタンが「Lagg i varukorg」（カートへ移動）
- [ ] 在庫切れが「Slutsald」
- [ ] 空状態メッセージが「Inga favoriter annu」

---

## テスト後のクリーンアップ

テストデータをリセットしたい場合:
```bash
npx wrangler d1 execute animehubs-db --local --file=tests/phase2-seed-data.sql
```

お気に入りデータだけクリアしたい場合:
```bash
npx wrangler d1 execute animehubs-db --local --command="DELETE FROM favorites"
```

likes_count をリセットしたい場合:
```bash
npx wrangler d1 execute animehubs-db --local --command="UPDATE products SET likes_count = 0"
```

---

## テスト結果記入欄

| # | テスト名 | 結果 | 備考 |
|---|---------|------|------|
| 01 | 商品一覧の表示と在庫バッジ | OK / NG | |
| 02 | 未ログイン時ハートボタン → リダイレクト | OK / NG | |
| 03 | Google OAuth ログイン | OK / NG | |
| 04 | お気に入り追加（楽観的更新） | OK / NG | |
| 05 | お気に入り解除（楽観的更新） | OK / NG | |
| 06 | ページリロード後の永続化 | OK / NG | |
| 07 | お気に入り一覧ページ | OK / NG | |
| 08 | お気に入り一覧 → カートへ移動 | OK / NG | |
| 09 | お気に入り一覧でのいいね解除 | OK / NG | |
| 10 | お気に入り0件の空状態 | OK / NG | |
| 11 | 連打テスト | OK / NG | |
| 12 | 未ログインでfavoritesアクセス | OK / NG | |
| 13 | スウェーデン語切り替え | OK / NG | |

### NG項目の詳細
| # | 問題内容 | スクリーンショット |
|---|---------|-------------------|
| | | |
