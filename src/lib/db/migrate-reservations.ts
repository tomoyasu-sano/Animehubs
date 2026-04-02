import type { OrderStatus } from "./schema";

export const MIGRATION_USER_EMAIL = "migration@animehubs.se";

/**
 * v1の予約ステータスをv2の注文ステータスにマッピング
 */
export function mapReservationStatus(status: string): OrderStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "completed";
  }
}

/**
 * 注文番号を生成（AH-YYYYMMDD-NNNN フォーマット）
 */
export function generateOrderNumber(date: string, seq: number): string {
  const dateStr = date.replace(/-/g, "");
  const seqStr = String(seq).padStart(4, "0");
  return `AH-${dateStr}-${seqStr}`;
}
