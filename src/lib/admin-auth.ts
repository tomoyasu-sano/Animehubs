import { auth } from "./auth-v2";

export interface AdminSession {
  userId: string;
  email: string;
  role: "admin";
}

/**
 * NextAuth v5 セッションから管理者であることを検証する。
 * 管理者でない場合は null を返す。
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.role !== "admin") return null;

  if (!session.user.id || !session.user.email) return null;

  return {
    userId: session.user.id,
    email: session.user.email,
    role: "admin",
  };
}
