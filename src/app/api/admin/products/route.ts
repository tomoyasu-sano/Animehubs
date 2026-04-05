import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import {
  adminGetProducts,
  createProduct,
  getFeaturedCount,
  getMaxFeaturedOrder,
} from "@/lib/db/admin-queries";
import { validateCreateProduct } from "@/lib/admin-validation";

const MAX_FEATURED = 20;

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 50, 100) : undefined;
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : undefined;

    const result = await adminGetProducts({ search, category, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;

    const errors = validateCreateProduct(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    const isFeatured = body.featured ? 1 : 0;
    let featuredOrder = 0;

    if (isFeatured) {
      const count = await getFeaturedCount();
      if (count >= MAX_FEATURED) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: [`Maximum ${MAX_FEATURED} featured products allowed`],
          },
          { status: 400 }
        );
      }
      featuredOrder = (await getMaxFeaturedOrder()) + 1;
    }

    const product = await createProduct({
      nameEn: body.nameEn as string,
      nameSv: body.nameSv as string,
      descriptionEn: body.descriptionEn as string,
      descriptionSv: body.descriptionSv as string,
      price: Number(body.price),
      stock: Number(body.stock ?? 1),
      category: body.category as string,
      condition: body.condition as string,
      heightCm: body.heightCm != null ? Number(body.heightCm) : null,
      images: (body.images as string) || "[]",
      featured: isFeatured,
      featuredOrder,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Admin products POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
