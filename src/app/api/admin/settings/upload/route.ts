import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const ALLOWED: Record<"logo" | "favicon", string[]> = {
  logo: ["png", "jpg", "jpeg", "webp", "svg"],
  favicon: ["png", "ico", "svg", "webp"],
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const type = form.get("type");
    const file = form.get("file");

    if (type !== "logo" && type !== "favicon") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File terlalu besar (maks 2MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED[type].includes(ext)) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung. Gunakan: ${ALLOWED[type].join(", ")}` },
        { status: 400 }
      );
    }

    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/${name}` });
  } catch {
    return NextResponse.json({ error: "Upload gagal" }, { status: 500 });
  }
}
