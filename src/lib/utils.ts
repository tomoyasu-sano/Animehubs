import { clsx, type ClassValue } from "clsx";

/**
 * Tailwind CSS クラスをマージするユーティリティ
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * 価格をSEK形式でフォーマット
 * @param priceInOre - オーレ単位の価格（1 SEK = 100 ore）
 * @returns フォーマットされた価格文字列（例: "1 299 kr"）
 */
export function formatPrice(priceInOre: number): string {
  const sek = priceInOre / 100;
  const formatted = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(sek);
  return `${formatted} kr`;
}

/**
 * 文字列からURLスラッグを生成
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * JSON文字列から画像URL配列をパースする
 * 不正なJSONの場合は空配列を返す
 */
export function parseImages(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // 不正なJSON — フォールバック
  }
  return [];
}

/**
 * 商品名をロケールに応じて取得
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  item: T,
  field: string,
  locale: string
): string {
  // snake_case (name_en) と camelCase (nameEn) の両方に対応
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const snakeKey = `${field}_${locale}` as keyof T;
  const camelKey = `${field}${capitalize(locale)}` as keyof T;
  const snakeFallback = `${field}_en` as keyof T;
  const camelFallback = `${field}En` as keyof T;
  return (item[snakeKey] as string) || (item[camelKey] as string) ||
         (item[snakeFallback] as string) || (item[camelFallback] as string) || "";
}
