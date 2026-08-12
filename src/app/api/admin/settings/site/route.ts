import { NextRequest, NextResponse } from "next/server";
import {
  getSiteSettings,
  saveSiteSettings,
} from "@/lib/site-settings";

const ALLOWED_KEYS = new Set([
  "siteName",
  "tagline",
  "description",
  "logoUrl",
  "faviconUrl",
  "logoMode",
  "metaTitle",
  "metaDescription",
  "baseUrl",
  "apiKeyPrefix",
]);

const API_KEY_PREFIX_RE = /^[A-Za-z0-9_-]{1,32}$/;

export async function GET() {
  try {
    return NextResponse.json(await getSiteSettings());
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key)) {
        if (value !== null) clean[key] = value;
      }
    }

    if (Object.keys(clean).length === 0) {
      return NextResponse.json({ error: "No valid site settings provided" }, { status: 400 });
    }

    if (clean.apiKeyPrefix !== undefined && !API_KEY_PREFIX_RE.test(clean.apiKeyPrefix as string)) {
      return NextResponse.json(
        { error: "apiKeyPrefix: hanya huruf, angka, _ atau - (maks 32 karakter)" },
        { status: 400 }
      );
    }

    const saved = await saveSiteSettings(clean);
    return NextResponse.json(saved);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}