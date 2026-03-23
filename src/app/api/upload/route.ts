import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // uploads ディレクトリが存在しない場合は作成
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 files allowed" },
        { status: 400 }
      );
    }

    const uploadedPaths: string[] = [];

    for (const file of files) {
      // ファイルタイプチェック
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      // ファイルサイズチェック
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size: 5MB` },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${uuidv4()}.${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      // ファイルを保存
      const buffer = Buffer.from(await file.arrayBuffer());

      // sharp でリサイズ（最大幅800px）
      try {
        const sharp = (await import("sharp")).default;
        const resized = await sharp(buffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        fs.writeFileSync(filepath.replace(`.${ext}`, ".jpg"), resized);
        uploadedPaths.push(`/uploads/${filename.replace(`.${ext}`, ".jpg")}`);
      } catch {
        // sharp が使えない場合はそのまま保存
        fs.writeFileSync(filepath, buffer);
        uploadedPaths.push(`/uploads/${filename}`);
      }
    }

    return NextResponse.json({ paths: uploadedPaths }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
