import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // ロケールプレフィックスが必要なパスにマッチ
    "/",
    "/(en|sv)/:path*",
    // API・静的ファイル・Next.js内部パスを除外
    "/((?!api|_next|_vercel|admin|.*\\..*).*)",
  ],
};
