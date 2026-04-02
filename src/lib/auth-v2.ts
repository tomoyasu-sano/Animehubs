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
  providers: [Google],
  // D1 + DrizzleAdapter の database session に互換性問題があるため JWT 戦略を使用
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    async jwt({ token, user }) {
      // 初回ログイン時にユーザー情報をトークンに埋め込む
      if (user) {
        token.id = user.id;
        token.role = isAdminEmail(user.email) ? "admin" : "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

/**
 * NextAuth ハンドラーを遅延初期化（getDb() が非同期のため）
 */
async function getAuthHandler() {
  const db = await getDb();
  return NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(db, {
      usersTable: users as any,
      accountsTable: accounts as any,
      sessionsTable: sessions as any,
      verificationTokensTable: verificationTokens as any,
    }),
  });
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
