# React Hydration Error (#418 / insertBefore) 調査ドキュメント

## 環境

| 項目 | 値 |
|------|-----|
| フレームワーク | Next.js 15 (App Router) |
| デプロイ先 | Cloudflare Workers + D1 |
| ビルド | OpenNext (`npm run build:cf` → `npm run dev:cf`) |
| ランタイム | Edge (Cloudflare Workers) |
| 認証 | NextAuth v5 (Google OAuth, JWT strategy) |
| React | 19.x |
| ローカル開発 | `npm run dev:cf` → wrangler (http://localhost:8787) |

## 症状

### 再現手順
1. ログイン済みの状態で商品詳細ページを開く
2. 「Add to Cart」ボタンをクリック
3. ページが「This page couldn't load.」と表示される
4. リロードするとカートには商品が正常に追加されている

### エラーメッセージ

**初期（修正前）:**
```
Uncaught NotFoundError: Failed to execute 'insertBefore' on 'Node':
The node before which the new node is to be inserted is not a child of this node.
```

**SessionProvider に server session を渡した後:**
```
Minified React error #418
(Hydration failed because the server rendered HTML didn't match the client)
```

### 発生タイミング
- カテゴリ再構成とは無関係（以前から存在していたバグ）
- 商品ページの「Add to Cart」クリック時に発生
- お気に入りページからの Add to Cart でも同様
- ローカル環境・本番環境の両方で発生

## 技術的背景

### カート状態管理 (`src/hooks/useCart.ts`)
- `useSyncExternalStore` + `localStorage` でカート状態を管理
- サーバー側は `getServerSnapshot()` で空配列を返す
- クライアント側は `getSnapshot()` で localStorage から読み込む
- 未認証時は操作を無効化し、空配列を返す

### 認証状態 (`src/components/Providers.tsx`)
- `SessionProvider` でセッションを提供
- Server Component の layout.tsx で `auth()` を呼び、session prop として渡している

### Header (`src/components/layout/Header.tsx`)
- `useSession()` と `useCart()` に依存する動的コンテンツが複数:
  - `{isAuthenticated && <Link href="/orders">}` — 注文履歴リンク
  - `{totalItems > 0 && <span>badge</span>}` — カートバッジ
  - `{isAuthenticated ? <LogoutButton> : <LoginLink>}` — 認証トグル
  - `{hasNewReservation && <span>!</span>}` — 予約通知（localStorage依存）
  - モバイルメニュー内にも同様の条件分岐あり

### AddToCartButton (`src/components/cart/AddToCartButton.tsx`)
- `useCart()` から `items` を取得し、在庫制限チェックに使用
- `useSession()` で認証状態を確認、未ログイン時はログインページへリダイレクト
- ボタンクリック時に `addItem(product)` → localStorage に保存 → カスタムイベント発火

## これまでに試した修正

### 修正1: saveItems の microtask 遅延 (useCart.ts)

**仮説:** `saveItems` 内で `cachedSnapshot` を同期的に更新すると、進行中のレンダリングと衝突する。

**変更:**
```typescript
// Before: cachedRaw を即座にリセット + イベント発火
function saveItems(newItems: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(newItems));
  cachedRaw = null;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

// After: microtask に遅延
function saveItems(newItems: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
  } catch {}
  queueMicrotask(() => {
    cachedRaw = null;
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  });
}
```

**結果:** insertBefore エラーは変わらず発生。効果なし。

### 修正2: SessionProvider に server session を渡す

**仮説:** SessionProvider が初期セッションなしで起動すると、status が "loading" → "authenticated" に変わり、SSR と初回クライアントレンダリングで差異が生まれる。

**変更:**
```typescript
// src/app/[locale]/layout.tsx
import { auth } from "@/lib/auth-v2";
const session = await auth();
<Providers session={session}>

// src/components/Providers.tsx
interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}
export default function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
```

**結果:** エラーが `insertBefore` から React #418 (hydration mismatch) に変化。根本は未解決。

### 修正3: Header に mounted-state パターン

**仮説:** Header の認証/カート依存コンテンツがサーバーとクライアントで異なるDOMを生成している。mounted フラグでクライアントマウント後にのみ動的コンテンツを表示すれば、SSR と初回レンダリングが一致する。

**変更:**
```typescript
// src/components/layout/Header.tsx
const [mounted, setMounted] = useState(false);
const isAuthenticated = mounted && status === "authenticated";

useEffect(() => {
  setMounted(true);
}, []);

// カートバッジ
{mounted && totalItems > 0 && (<span>...</span>)}

// 予約通知
{mounted && hasNewReservation && (<span>!</span>)}

// モバイルカート数
{t("common.cart")} {mounted && totalItems > 0 && `(${totalItems})`}
```

**結果:** React #418 エラーが依然として発生。効果なし。

## 現在のファイル状態

修正1〜3はすべて適用済み（コミット未実施）。

### 変更済みファイル一覧
- `src/hooks/useCart.ts` — saveItems の microtask 遅延（修正1）
- `src/components/Providers.tsx` — session prop 追加（修正2）
- `src/app/[locale]/layout.tsx` — auth() 呼び出し + session 渡し（修正2）
- `src/components/layout/Header.tsx` — mounted-state パターン（修正3）

## 未調査の可能性

1. **AddToCartButton 自体の hydration mismatch**
   - `useCart()` の `items` がサーバー（空）とクライアント（localStorage）で異なる
   - `useSyncExternalStore` の SSR 対応が Cloudflare Workers 環境で正しく動作しているか未確認

2. **商品詳細ページの他のクライアントコンポーネント**
   - 商品詳細ページ全体の SSR/Client 差異を未調査
   - お気に入りボタン等、他の認証依存コンポーネントの影響

3. **Cloudflare Workers / OpenNext 固有の問題**
   - Edge Runtime での `useSyncExternalStore` の `getServerSnapshot` の挙動
   - OpenNext の SSR と hydration の整合性

4. **React 19 の Strict Mode や Suspense の影響**
   - React 19 での hydration エラーハンドリングの変更点

5. **Next.js 15 の PPR (Partial Pre-Rendering) の影響**
   - App Router の streaming SSR とクライアント hydration のタイミング

6. **NextIntlClientProvider の影響**
   - SSR 時のメッセージとクライアント側のメッセージの差異

## 関連ファイルパス

```
src/hooks/useCart.ts                         — カート状態管理
src/components/layout/Header.tsx             — ヘッダー（認証/カート依存UI）
src/components/cart/AddToCartButton.tsx       — Add to Cart ボタン
src/components/cart/CartSidebar.tsx           — カートサイドバー
src/components/Providers.tsx                  — SessionProvider ラッパー
src/app/[locale]/layout.tsx                  — ロケールレイアウト（auth + Providers）
src/app/[locale]/products/[id]/page.tsx      — 商品詳細ページ
src/app/[locale]/favorites/page.tsx          — お気に入りページ
```

## 再現用コマンド

```bash
# ローカル環境の起動
npm run build:cf && npm run dev:cf

# テストデータ投入
npx wrangler d1 execute animehubs-db --local --file=tests/phase2-seed-data.sql

# ブラウザで http://localhost:8787 → ログイン → 商品詳細 → Add to Cart
```
