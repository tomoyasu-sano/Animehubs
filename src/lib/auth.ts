import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "animehubs-admin-secret-key-change-in-production";
const JWT_EXPIRES_IN = "24h";
const COOKIE_NAME = "admin_token";

export interface AdminTokenPayload {
  userId: string;
  username: string;
}

/**
 * パスワードをハッシュ化
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

/**
 * パスワードを検証
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * JWT トークンを生成
 */
export function generateToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * JWT トークンを検証
 */
export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * リクエストから管理者トークンを取得・検証
 */
export function getAdminFromRequest(request: NextRequest): AdminTokenPayload | null {
  // Cookie からトークンを取得
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    // Authorization ヘッダーからも試行
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return verifyToken(authHeader.slice(7));
    }
    return null;
  }
  return verifyToken(token);
}

/**
 * Cookie 名を取得（レスポンス設定用）
 */
export function getAdminCookieName(): string {
  return COOKIE_NAME;
}
