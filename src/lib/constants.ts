// 受け渡し場所
export const PICKUP_LOCATIONS = [
  {
    id: "central-station",
    name_en: "Uppsala Central Station",
    name_sv: "Uppsala Centralstation",
  },
  {
    id: "stora-torget",
    name_en: "Stora Torget",
    name_sv: "Stora Torget",
  },
  {
    id: "forumgallerian",
    name_en: "Forumgallerian",
    name_sv: "Forumgallerian",
  },
] as const;

// 時間帯
export const TIME_SLOTS = [
  {
    id: "weekday-evening",
    name_en: "Weekday Evening (17:00-19:00)",
    name_sv: "Vardag kvall (17:00-19:00)",
  },
  {
    id: "weekend-morning",
    name_en: "Weekend Morning (10:00-12:00)",
    name_sv: "Helg formiddag (10:00-12:00)",
  },
  {
    id: "weekend-afternoon",
    name_en: "Weekend Afternoon (13:00-16:00)",
    name_sv: "Helg eftermiddag (13:00-16:00)",
  },
] as const;

// 商品カテゴリ
export const CATEGORIES = [
  "figures",
  "keychains",
  "pins",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// カテゴリ表示名
export const CATEGORY_LABELS: Record<Category, { en: string; sv: string }> = {
  figures: { en: "Figures", sv: "Figurer" },
  keychains: { en: "Keychains", sv: "Nyckelringar" },
  pins: { en: "Pins & Badges", sv: "Pins & Märken" },
  other: { en: "Other", sv: "Övrigt" },
};

// コンディション
export const CONDITIONS = ["sealed", "excellent", "good", "fair"] as const;

export type Condition = (typeof CONDITIONS)[number];

// コンディション表示名
export const CONDITION_LABELS: Record<Condition, { en: string; sv: string }> = {
  sealed: { en: "Sealed", sv: "Oöppnad" },
  excellent: { en: "Opened - Excellent", sv: "Öppnad - Utmärkt" },
  good: { en: "Opened - Good", sv: "Öppnad - Bra" },
  fair: { en: "Opened - Fair", sv: "Öppnad - Hyfsat" },
};

// 対応ロケール
export const LOCALES = ["en", "sv"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// 通貨設定（将来EUR切り替え時はここだけ変更）
export const CURRENCY = "SEK" as const;
export const CURRENCY_SYMBOL = "kr";

// 送料設定（öre単位: 1 SEK = 100 öre）
export const FREE_SHIPPING_THRESHOLD_ORE = 59900; // 599 SEK
export const SHIPPING_FEE_ORE = 4500; // 45 SEK

// 実物確認の予約制限
export const MAX_ACTIVE_RESERVATIONS = 3;
export const RESERVATION_EXPIRY_DAYS = 7;

// Instagram URL
export const INSTAGRAM_URL = "https://www.instagram.com/animehubs_swe/";

// 管理者メールアドレス（Googleログイン時に自動で role='admin' 付与）
export const ADMIN_EMAILS = [
  "anytimes.sano@gmail.com",
  "asa5ng13@gmail.com",
  "yuya4467@gmail.com",
] as const;
