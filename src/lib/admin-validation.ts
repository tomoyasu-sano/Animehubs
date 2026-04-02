// 管理者API用バリデーション

import { CATEGORIES, CONDITIONS } from "./constants";
import type { ValidationError } from "./validation";

export interface CreateProductInput {
  nameEn: string;
  nameSv: string;
  descriptionEn: string;
  descriptionSv: string;
  price: number;
  category: string;
  condition: string;
  stock?: number;
  images?: string;
  featured?: boolean;
}

export interface UpdateProductInput {
  nameEn?: string;
  nameSv?: string;
  descriptionEn?: string;
  descriptionSv?: string;
  price?: number;
  category?: string;
  condition?: string;
  stock?: number;
  images?: string;
  featured?: boolean;
}

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_PRICE = 10_000_000; // 100,000 SEK in öre

function validateStringField(
  value: unknown,
  fieldName: string,
  maxLength: number,
  errors: ValidationError[],
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ field: fieldName, message: `${fieldName} is required` });
  } else if (value.length > maxLength) {
    errors.push({ field: fieldName, message: `${fieldName} must be at most ${maxLength} characters` });
  }
}

function validatePrice(value: unknown, errors: ValidationError[]): void {
  if (value == null) {
    errors.push({ field: "price", message: "Price is required" });
    return;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > MAX_PRICE) {
    errors.push({ field: "price", message: `Price must be between 0 and ${MAX_PRICE}` });
  }
}

function validateStock(value: unknown, errors: ValidationError[]): void {
  if (value == null) return; // optional
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) {
    errors.push({ field: "stock", message: "Stock must be a non-negative integer" });
  }
}

function validateCategory(value: unknown, errors: ValidationError[]): void {
  if (typeof value !== "string" || !(CATEGORIES as readonly string[]).includes(value)) {
    errors.push({ field: "category", message: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` });
  }
}

function validateCondition(value: unknown, errors: ValidationError[]): void {
  if (typeof value !== "string" || !(CONDITIONS as readonly string[]).includes(value)) {
    errors.push({ field: "condition", message: `Invalid condition. Must be one of: ${CONDITIONS.join(", ")}` });
  }
}

export function validateCreateProduct(input: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  validateStringField(input.nameEn, "nameEn", MAX_NAME_LENGTH, errors);
  validateStringField(input.nameSv, "nameSv", MAX_NAME_LENGTH, errors);
  validateStringField(input.descriptionEn, "descriptionEn", MAX_DESCRIPTION_LENGTH, errors);
  validateStringField(input.descriptionSv, "descriptionSv", MAX_DESCRIPTION_LENGTH, errors);
  validatePrice(input.price, errors);
  validateCategory(input.category, errors);
  validateCondition(input.condition, errors);
  validateStock(input.stock, errors);

  return errors;
}

export function validateUpdateProduct(input: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.nameEn !== undefined) validateStringField(input.nameEn, "nameEn", MAX_NAME_LENGTH, errors);
  if (input.nameSv !== undefined) validateStringField(input.nameSv, "nameSv", MAX_NAME_LENGTH, errors);
  if (input.descriptionEn !== undefined) validateStringField(input.descriptionEn, "descriptionEn", MAX_DESCRIPTION_LENGTH, errors);
  if (input.descriptionSv !== undefined) validateStringField(input.descriptionSv, "descriptionSv", MAX_DESCRIPTION_LENGTH, errors);
  if (input.price !== undefined) validatePrice(input.price, errors);
  if (input.category !== undefined) validateCategory(input.category, errors);
  if (input.condition !== undefined) validateCondition(input.condition, errors);
  if (input.stock !== undefined) validateStock(input.stock, errors);

  return errors;
}
