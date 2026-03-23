// 予約バリデーション

export interface ReservationInput {
  customerName: string;
  customerEmail: string;
  location: string;
  timeSlot: string;
  items: ReservationItemInput[];
  totalAmount: number;
  notes?: string;
  locale?: string;
}

export interface ReservationItemInput {
  productId: string;
  nameEn: string;
  nameSv: string;
  quantity: number;
  price: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_LOCATIONS = ["central-station", "stora-torget", "forumgallerian", "instagram"];
const VALID_TIME_SLOTS = ["weekday-evening", "weekend-morning", "weekend-afternoon", "instagram"];

export function validateReservation(input: ReservationInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // 名前: 2文字以上
  if (!input.customerName || input.customerName.trim().length < 2) {
    errors.push({ field: "customerName", message: "Name must be at least 2 characters" });
  }

  // メールアドレス形式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.customerEmail || !emailRegex.test(input.customerEmail)) {
    errors.push({ field: "customerEmail", message: "Invalid email address" });
  }

  // 場所
  if (!input.location || !VALID_LOCATIONS.includes(input.location)) {
    errors.push({ field: "location", message: "Invalid pickup location" });
  }

  // 時間帯
  if (!input.timeSlot || !VALID_TIME_SLOTS.includes(input.timeSlot)) {
    errors.push({ field: "timeSlot", message: "Invalid time slot" });
  }

  // アイテム
  if (!input.items || input.items.length === 0) {
    errors.push({ field: "items", message: "Cart is empty" });
  } else {
    for (const item of input.items) {
      if (!item.productId) {
        errors.push({ field: "items", message: "Invalid product ID" });
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push({ field: "items", message: "Quantity must be at least 1" });
      }
      if (!item.price || item.price < 0) {
        errors.push({ field: "items", message: "Invalid price" });
      }
    }
  }

  // 合計金額
  if (input.totalAmount == null || input.totalAmount < 0) {
    errors.push({ field: "totalAmount", message: "Invalid total amount" });
  }

  return errors;
}
