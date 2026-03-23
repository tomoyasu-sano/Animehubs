import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "animehubs-admin-secret-key-change-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "animehubs-admin";
const JWT_EXPIRES_IN = "24h";
const COOKIE_NAME = "admin_token";

export interface AdminTokenPayload {
  role: "admin";
}

/**
 * 管理者パスワードを検証
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/**
 * JWT トークンを生成
 */
export function generateToken(): string {
  const payload: AdminTokenPayload = { role: "admin" };
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
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
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
