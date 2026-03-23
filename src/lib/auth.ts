import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

function getAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error("ADMIN_PASSWORD_HASH environment variable is required. Generate with: npx bcryptjs hash <password>");
  }
  return hash;
}

const JWT_EXPIRES_IN = "24h";
const COOKIE_NAME = "admin_token";

export interface AdminTokenPayload {
  role: "admin";
}

/**
 * 管理者パスワードを検証（bcryptハッシュ比較）
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = getAdminPasswordHash();
  return bcrypt.compare(password, hash);
}

/**
 * JWT トークンを生成
 */
export function generateToken(): string {
  const payload: AdminTokenPayload = { role: "admin" };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * JWT トークンを検証
 */
export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
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
