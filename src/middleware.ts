import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

// 保護対象パス（ログイン必須）
export const PROTECTED_PATHS = [
  "/cart",
  "/checkout",
  "/favorites",
  "/orders",
  "/account",
] as const;

// 管理者専用パス
export const ADMIN_PATHS = ["/admin"] as const;

/**
 * ロケールプレフィックスを除去してパスを判定
 */
function stripLocale(pathname: string): string {
  const localePattern = /^\/(en|sv)(\/|$)/;
  return pathname.replace(localePattern, "/");
}

/**
 * パスからロケールを抽出（デフォルト: "en"）
 */
function extractLocale(pathname: string): string {
  const match = pathname.match(/^\/(en|sv)(\/|$)/);
  return match ? match[1] : "en";
}

/**
 * 保護対象パスかどうかを判定
 */
export function isProtectedPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return PROTECTED_PATHS.some(
    (p) => stripped === p || stripped.startsWith(p + "/"),
  );
}

/**
 * 管理者パスかどうかを判定
 */
export function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 管理者パスのチェック（i18nミドルウェアの前に処理）
  if (isAdminPath(pathname)) {
    // 既存の管理者認証をそのまま通す（Phase 1-2 完了後にNextAuth v5に切り替え）
    return NextResponse.next();
  }

  // 保護対象パスのチェック
  if (isProtectedPath(pathname)) {
    // NextAuth セッション確認（動的import で循環参照を回避）
    try {
      const { auth } = await import("./lib/auth-v2");
      const session = await auth();
      if (!session?.user) {
        const locale = extractLocale(pathname);
        const loginUrl = new URL(`/${locale}/auth/login`, request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      // auth 失敗時も保護対象パスへのアクセスは拒否（ログインへリダイレクト）
      const locale = extractLocale(pathname);
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // i18n ミドルウェア
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(en|sv)/:path*",
    "/((?!api|_next|_vercel|admin|.*\\..*).*)",
  ],
};
