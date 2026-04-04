import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { ADMIN_EMAILS } from "./constants";
import { getDb } from "./db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "./db/schema";

/**
 * 管理者メールアドレスかどうかを判定（大文字小文字を無視）
 */
export function isAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === lower);
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  // D1 + DrizzleAdapter の database session に互換性問題があるため JWT 戦略を使用
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (user.email) {
          token.email = user.email;
        }
      }
      token.role = isAdminEmail(token.email) ? "admin" : "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role ?? "user";
      }
      return session;
    },
  },
};

/**
 * NextAuth ハンドラーを遅延初期化（getDb() が非同期のため）
 * Promise をキャッシュしてリクエストごとの再生成を防止
 */
let cachedHandler: ReturnType<typeof initAuthHandler> | null = null;

function initAuthHandler() {
  return getDb().then((db) =>
    NextAuth({
      ...authConfig,
      adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    }),
  );
}

function getAuthHandler() {
  if (!cachedHandler) {
    cachedHandler = initAuthHandler();
  }
  return cachedHandler;
}

export const handlers = {
  GET: async (req: Request) => {
    const { handlers: h } = await getAuthHandler();
    return h.GET(req as unknown as Parameters<typeof h.GET>[0]);
  },
  POST: async (req: Request) => {
    const { handlers: h } = await getAuthHandler();
    return h.POST(req as unknown as Parameters<typeof h.POST>[0]);
  },
};

export async function auth() {
  const { auth: a } = await getAuthHandler();
  return a();
}

export async function signIn(
  provider?: string,
  options?: Record<string, unknown>,
) {
  const result = await getAuthHandler();
  return result.signIn(provider, options);
}

export async function signOut() {
  const { signOut: s } = await getAuthHandler();
  return s();
}
