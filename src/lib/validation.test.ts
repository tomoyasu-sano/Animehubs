import { describe, it, expect } from "vitest";
import { validateReservation, type ReservationInput } from "./validation";

const validInput: ReservationInput = {
  customerName: "John Doe",
  customerEmail: "john@example.com",
  location: "central-station",
  timeSlot: "weekday-evening",
  items: [
    {
      productId: "product-1",
      nameEn: "Naruto Figure",
      nameSv: "Naruto Figur",
      quantity: 1,
      price: 129900,
    },
  ],
  totalAmount: 129900,
};

describe("validateReservation", () => {
  it("有効な入力でエラーなし", () => {
    const errors = validateReservation(validInput);
    expect(errors).toHaveLength(0);
  });

  it("名前が空の場合エラー", () => {
    const errors = validateReservation({ ...validInput, customerName: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("customerName");
  });

  it("名前が1文字の場合エラー", () => {
    const errors = validateReservation({ ...validInput, customerName: "A" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("customerName");
  });

  it("名前が2文字の場合OK", () => {
    const errors = validateReservation({ ...validInput, customerName: "Ab" });
    expect(errors).toHaveLength(0);
  });

  it("メールが空の場合エラー", () => {
    const errors = validateReservation({ ...validInput, customerEmail: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("customerEmail");
  });

  it("メールの形式が不正な場合エラー", () => {
    const errors = validateReservation({ ...validInput, customerEmail: "invalid-email" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("customerEmail");
  });

  it("メールに@がない場合エラー", () => {
    const errors = validateReservation({ ...validInput, customerEmail: "testexample.com" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("customerEmail");
  });

  it("有効なメール形式はOK", () => {
    const errors = validateReservation({ ...validInput, customerEmail: "user@example.co.jp" });
    expect(errors).toHaveLength(0);
  });

  it("無効な場所の場合エラー", () => {
    const errors = validateReservation({ ...validInput, location: "invalid-place" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("location");
  });

  it("Instagram場所はOK", () => {
    const errors = validateReservation({
      ...validInput,
      location: "instagram",
      timeSlot: "instagram",
    });
    expect(errors).toHaveLength(0);
  });

  it("無効な時間帯の場合エラー", () => {
    const errors = validateReservation({ ...validInput, timeSlot: "midnight" });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("timeSlot");
  });

  it("アイテムが空の場合エラー", () => {
    const errors = validateReservation({ ...validInput, items: [] });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("items");
  });

  it("アイテムの数量が0の場合エラー", () => {
    const errors = validateReservation({
      ...validInput,
      items: [{ ...validInput.items[0], quantity: 0 }],
    });
    expect(errors.some((e) => e.field === "items")).toBe(true);
  });

  it("複数エラーを同時に検出", () => {
    const errors = validateReservation({
      customerName: "",
      customerEmail: "bad",
      location: "invalid",
      timeSlot: "invalid",
      items: [],
      totalAmount: -1,
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});
