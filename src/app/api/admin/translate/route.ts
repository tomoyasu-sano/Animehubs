import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

interface TranslateRequest {
  name: string;
  description: string;
}

interface TranslateResponse {
  nameSv: string;
  descriptionSv: string;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as TranslateRequest;

    if (!body.name && !body.description) {
      return NextResponse.json(
        { error: "At least name or description is required" },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a professional translator for an anime goods e-commerce store in Sweden.
Translate the following product information from English to Swedish.
Keep anime character names, series names, and brand names in their original form (do not translate them).
Use natural Swedish that feels friendly and approachable, not overly formal.

Return ONLY a valid JSON object with these keys: "nameSv", "descriptionSv"
Do not include markdown code fences or any other text.

Product name (English): ${body.name || ""}
Product description (English): ${body.description || ""}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON部分を抽出（コードフェンス対応）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse translation response" },
        { status: 500 },
      );
    }

    const translated = JSON.parse(jsonMatch[0]) as TranslateResponse;

    return NextResponse.json({
      nameSv: translated.nameSv || "",
      descriptionSv: translated.descriptionSv || "",
    });
  } catch (error) {
    console.error("Translate API error:", error);
    return NextResponse.json(
      { error: "Translation failed. Please try again." },
      { status: 500 },
    );
  }
}
