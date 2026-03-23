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
  "scale-figures",
  "nendoroid",
  "figma",
  "prize-figures",
  "garage-kits",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// カテゴリ表示名
export const CATEGORY_LABELS: Record<Category, { en: string; sv: string }> = {
  figures: { en: "Figures", sv: "Figurer" },
  "scale-figures": { en: "Scale Figures", sv: "Skalfigurer" },
  nendoroid: { en: "Nendoroid", sv: "Nendoroid" },
  figma: { en: "Figma", sv: "Figma" },
  "prize-figures": { en: "Prize Figures", sv: "Prisfigurer" },
  "garage-kits": { en: "Garage Kits", sv: "Garage Kits" },
  other: { en: "Other", sv: "Ovrigt" },
};

// コンディション
export const CONDITIONS = ["new", "like_new", "good", "fair"] as const;

export type Condition = (typeof CONDITIONS)[number];

// コンディション表示名
export const CONDITION_LABELS: Record<Condition, { en: string; sv: string }> = {
  new: { en: "New", sv: "Ny" },
  like_new: { en: "Like New", sv: "Som ny" },
  good: { en: "Good", sv: "Bra" },
  fair: { en: "Fair", sv: "Hyfsat" },
};

// 対応ロケール
export const LOCALES = ["en", "sv"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
