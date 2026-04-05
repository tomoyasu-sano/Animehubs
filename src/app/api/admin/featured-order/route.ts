import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getFeaturedProducts,
  updateFeaturedOrder,
} from "@/lib/db/admin-queries";

interface FeaturedOrderItem {
  id: string;
  order: number;
}

function validateItems(
  body: unknown
): { items: FeaturedOrderItem[]; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || !("items" in body)) {
    return { items: [], errors: ["items must be an array"] };
  }

  const { items } = body as { items: unknown };

  if (!Array.isArray(items)) {
    return { items: [], errors: ["items must be an array"] };
  }

  if (items.length === 0) {
    return { items: [], errors: ["items must not be empty"] };
  }

  if (items.length > 50) {
    return { items: [], errors: ["Too many items (max 50)"] };
  }

  const ids = new Set<string>();
  const validated: FeaturedOrderItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      typeof item.order !== "number"
    ) {
      errors.push(`Invalid item format at index ${i}`);
      continue;
    }

    if (!Number.isInteger(item.order) || item.order < 1) {
      errors.push("order must be a positive integer");
      continue;
    }

    if (ids.has(item.id)) {
      errors.push("Duplicate product IDs");
      continue;
    }

    ids.add(item.id);
    validated.push({ id: item.id, order: item.order });
  }

  return { items: validated, errors };
}

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featuredProducts = await getFeaturedProducts();
    return NextResponse.json({ items: featuredProducts });
  } catch (error) {
    console.error("Admin featured-order GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, errors } = validateItems(body);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // 全件一致チェック: 現在のFeatured商品と過不足なく一致すること
    const currentFeatured = await getFeaturedProducts();
    const currentIds = new Set(currentFeatured.map((p) => p.id));
    const submittedIds = new Set(items.map((i) => i.id));

    if (
      currentIds.size !== submittedIds.size ||
      [...currentIds].some((id) => !submittedIds.has(id))
    ) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: ["items must include all featured products exactly"],
        },
        { status: 400 }
      );
    }

    await updateFeaturedOrder(items);

    return NextResponse.json({
      message: "Featured order updated successfully",
    });
  } catch (error) {
    console.error("Admin featured-order PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
