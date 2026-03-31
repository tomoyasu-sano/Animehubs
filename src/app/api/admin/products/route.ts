import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { adminGetProducts, createProduct } from "@/lib/db/admin-queries";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const result = await adminGetProducts({ search, category, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const { nameEn, nameSv, descriptionEn, descriptionSv, price, category, condition } = body as {
      nameEn: string; nameSv: string; descriptionEn: string; descriptionSv: string;
      price: number; category: string; condition: string;
      stock?: number; images?: string; featured?: boolean;
    };

    if (!nameEn || !nameSv || !descriptionEn || !descriptionSv || price == null || !category || !condition) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const product = await createProduct({
      nameEn,
      nameSv,
      descriptionEn,
      descriptionSv,
      price: Number(price),
      stock: Number(body.stock ?? 1),
      category,
      condition,
      images: (body.images as string) || "[]",
      featured: body.featured ? 1 : 0,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Admin products POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
