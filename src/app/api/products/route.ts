import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db/queries";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const featured = searchParams.get("featured") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const result = await getProducts({ search, category, featured, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
