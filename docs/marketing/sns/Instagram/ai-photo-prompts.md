# AI写真加工プロンプト集

作成日: 2026-04-07

実物のフィギュア・小物はそのまま活かし、背景・窓・部屋をAIで「北欧の部屋」に加工する。

---

## 使うツール

| ツール | 方法 | おすすめ度 |
|--------|------|-----------|
| **ChatGPT（GPT-4o）** | 写真をアップロード → 編集指示 | ★★★ 最も自然 |
| **Photoroom** | 背景除去 → AI背景に差し替え | ★★☆ 手軽 |
| **Gemini** | 写真アップロード → 編集指示 | ★★☆ |

**おすすめ: ChatGPTに写真を貼って、以下のプロンプトを送る。**
被写体を維持したまま背景だけ変えてくれる。

---

## プロンプト一覧

### 1. 棚ディスプレイ（メイン用 / フィード投稿向け）

```
Edit this photo. Keep the figure and all items exactly as they are — do not change, move, or alter them in any way.

Replace only the background and surroundings with a minimalist Scandinavian living room:
- White walls
- A large window on the left side with soft natural daylight coming through
- Light oak wooden shelf holding the items
- Clean, uncluttered space
- Cool-toned color palette (soft whites, light grays, pale wood)
- The overall mood should feel calm, cozy, and curated

Keep the lighting natural and soft. No dramatic shadows. The style should look like a real interior photo, not AI-generated.
```

### 2. 窓辺ディスプレイ（Nordic感を最大限に）

```
Edit this photo. Keep the figure and objects exactly as they are.

Place them on a white windowsill in a Scandinavian apartment:
- Large window behind, showing a soft overcast sky (typical Nordic light)
- Sheer white linen curtains on both sides, slightly moving
- The windowsill is painted white or light gray
- Soft diffused daylight illuminating the figure from behind and the side
- A small green plant or a white ceramic mug nearby (only if it fits naturally)
- Cool, slightly desaturated tones

Make it look like a real photograph taken with a smartphone. Natural, not overly polished.
```

### 3. フラットレイ（真上から / From Japan投稿向け）

```
Edit this photo. Keep all items (boxes, figures, packaging) exactly as they are.

Change only the surface and background:
- The items should appear on a clean light oak wooden table
- Shot from directly above (flat lay perspective)
- Soft natural daylight from the upper left
- Minimal shadows, bright and airy
- Scandinavian aesthetic: clean, warm wood tone, no clutter
- Slightly cool white balance

Make it look like a real lifestyle flat lay photo for Instagram.
```

### 4. 未開封パッケージ（箱をかっこよく見せる）

```
Edit this photo. Keep the product box and packaging exactly as they are — do not alter the box, text, or labels.

Improve only the background and lighting:
- Place the box on a clean white or light gray surface
- Simple, minimal background (white wall or very soft gradient)
- Studio-like soft lighting from the upper left, creating gentle shadows
- The Japanese text on the box should remain fully readable
- Slightly cool color temperature
- Clean, professional product photography feel

The result should look like a premium e-commerce product shot.
```

### 5. 部屋全体の雰囲気（Reels/ストーリーズ用）

```
Edit this photo. Keep the figure, shelf items, and any real objects exactly as they are.

Transform the room around them into a cozy Scandinavian living space:
- White or very light gray walls
- Light wooden flooring (oak or birch)
- A window with soft daylight and sheer curtains
- Minimalist decor: maybe a small plant, a candle, or a simple frame on the wall
- Warm evening lighting — as if a candle is lit nearby
- The mood should feel like "hygge" — cozy, quiet, intentional
- Cool overall tones with warm accent from candlelight

Make it photorealistic. It should look like someone's real apartment in Uppsala, Sweden.
```

### 6. 手持ち写真（自分の手+フィギュア）

```
Edit this photo. Keep my hand and the figure I'm holding exactly as they are.

Change only the background:
- Blurred Scandinavian room in the background (shallow depth of field)
- White walls, hint of a window with natural light
- Soft, out-of-focus warm tones in the background
- The figure in my hand should be sharp and in focus
- Natural, candid feel — like a casual Instagram photo

Do not change my hand, skin tone, or the figure in any way.
```

### 7. 複数フィギュア並べ（コレクション感）

```
Edit this photo. Keep all figures and items exactly as they are — same positions, same details.

Enhance the setting:
- Place them on a long light oak shelf against a white wall
- Soft natural light from a window on the right side
- Each figure should be clearly visible and well-lit
- Clean, gallery-like display feel
- Small decorative touches nearby: a tiny plant, a candle, a book spine
- Cool Scandinavian color palette

The result should look like a curated anime collection in a stylish Nordic apartment.
```

---

## 使い方のコツ

### ChatGPTの場合
1. 写真をチャットに貼り付ける
2. 上のプロンプトをそのままコピペして送る
3. 結果が気に入らなければ追加指示:
   - `Make the lighting softer` — もっと柔らかく
   - `Make it less AI-looking, more natural` — もっと自然に
   - `The background is too bright, tone it down` — 背景が明るすぎ
   - `Keep the same edit but make the window larger` — 窓を大きく
   - `The colors are too warm, make them cooler` — もっと寒色に

### Photoroomの場合
1. 写真を読み込む → 背景が自動除去される
2. 「AI背景」→ プロンプト入力欄に短縮版を入力:
   ```
   Minimalist Scandinavian room, white walls, large window with natural daylight, light oak shelf, cool tones, cozy
   ```
3. 生成 → 気に入るまでバリエーションを試す

### 注意点
- **フィギュアの顔や細部が変わっていないか必ず確認**（AIが勝手に描き直すことがある）
- 結果が「AIっぽい」場合は、Lightroomで軽く加工するとさらに自然になる:
  - 彩度を少し下げる
  - ノイズを微量追加（Lightroomの「粒子」）
  - 若干のビネット（四隅を暗く）
- 同じプロンプトを使い回して、フィード全体の統一感を保つ
