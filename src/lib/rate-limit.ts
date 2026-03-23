import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * インメモリレート制限
 * @param request - NextRequest
 * @param key - レート制限のキー（エンドポイント識別用）
 * @param maxRequests - ウィンドウ内の最大リクエスト数
 * @param windowMs - ウィンドウサイズ（ミリ秒）
 * @returns true = 許可, false = レート制限超過
 */
export function checkRateLimit(
  request: NextRequest,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const ip = getClientIp(request);
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  const entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    store.set(storeKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
