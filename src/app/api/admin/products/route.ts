import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { adminGetProducts, createProduct } from "@/lib/db/admin-queries";

export async function GET(request: NextRequest) {
  try {
    initializeDatabase();

    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined;

    const result = adminGetProducts({ search, category, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin products GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();

    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    const { nameEn, nameSv, descriptionEn, descriptionSv, price, category, condition } = body;
    if (!nameEn || !nameSv || !descriptionEn || !descriptionSv || price == null || !category || !condition) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const product = createProduct({
      nameEn,
      nameSv,
      descriptionEn,
      descriptionSv,
      price: Number(price),
      stock: Number(body.stock ?? 1),
      category,
      condition,
      images: body.images || "[]",
      featured: body.featured ? 1 : 0,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Admin products POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
