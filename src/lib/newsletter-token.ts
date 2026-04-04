import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_EXPIRY_DAYS = 30;

type VerifyResult =
  | { valid: true; userId: string }
  | { valid: false; reason: "expired" | "invalid" };

/**
 * 配信停止用の署名付きトークンを生成する。
 * フォーマット: Base64URL(userId:expiresTimestamp) + "." + HMAC-SHA256(payload, secret)
 */
export function generateUnsubscribeToken(userId: string, secret: string): string {
  if (!userId) throw new Error("userId is required");
  if (!secret) throw new Error("secret is required");

  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  const payload = `${userId}:${expiresAt}`;
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * 配信停止トークンを検証する。
 */
export function verifyUnsubscribeToken(token: string, secret: string): VerifyResult {
  if (!token || !token.includes(".")) {
    return { valid: false, reason: "invalid" };
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return { valid: false, reason: "invalid" };
  }

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString();
  } catch {
    return { valid: false, reason: "invalid" };
  }

  // 署名検証
  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "invalid" };
  }

  // ペイロードのパース
  const parts = payload.split(":");
  if (parts.length < 2) {
    return { valid: false, reason: "invalid" };
  }

  const userId = parts.slice(0, -1).join(":");
  const expiresAt = parseInt(parts[parts.length - 1], 10);

  if (isNaN(expiresAt)) {
    return { valid: false, reason: "invalid" };
  }

  // 有効期限チェック
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, userId };
}
