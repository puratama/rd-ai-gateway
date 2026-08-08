import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

export async function GET() {
  try {
    const s = await getSiteSettings();
    return NextResponse.json({
      siteName: s.siteName,
      tagline: s.tagline,
      description: s.description,
      logoUrl: s.logoUrl,
      faviconUrl: s.faviconUrl,
      logoMode: s.logoMode,
      baseUrl: s.baseUrl,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}