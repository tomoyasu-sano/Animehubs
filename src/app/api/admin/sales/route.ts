import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  createSale,
  getSalesSummary,
  updateProduct,
} from "@/lib/db/admin-queries";
import type { SalesChannel } from "@/lib/db/schema";

const VALID_CHANNELS: SalesChannel[] = ["site", "vinted", "other"];
const MAX_AMOUNT = 10_000_000; // 100,000 SEK in öre

function toOreOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num) || num > MAX_AMOUNT) {
    return NaN; // 呼び出し側で検出
  }
  return num;
}

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const summary = await getSalesSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Admin sales GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // --- バリデーション ---
    const channel = body.channel as SalesChannel;
    if (!VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 },
      );
    }

    const nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() : "";
    if (!nameEn) {
      return NextResponse.json({ error: "nameEn is required" }, { status: 400 });
    }

    const soldPrice = toOreOrNull(body.soldPrice);
    if (soldPrice == null || Number.isNaN(soldPrice)) {
      return NextResponse.json({ error: "Invalid soldPrice" }, { status: 400 });
    }

    const costSek = toOreOrNull(body.costSek);
    const sellerFee = toOreOrNull(body.sellerFee) ?? 0;
    const sellerShipping = toOreOrNull(body.sellerShipping) ?? 0;
    if (
      Number.isNaN(costSek) ||
      Number.isNaN(sellerFee) ||
      Number.isNaN(sellerShipping)
    ) {
      return NextResponse.json(
        { error: "Invalid cost/fee/shipping" },
        { status: 400 },
      );
    }

    const productId =
      typeof body.productId === "string" && body.productId ? body.productId : null;

    const sale = await createSale({
      productId,
      nameEn,
      channel,
      soldPrice,
      costSek,
      sellerFee,
      sellerShipping,
      note: typeof body.note === "string" ? body.note : null,
    });

    // 商品に紐づく場合は在庫を0にする（Sold Out 表示）
    if (productId) {
      await updateProduct(productId, { stock: 0 });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error("Admin sales POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
