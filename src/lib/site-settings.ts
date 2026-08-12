import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";

export interface SiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  logoMode: "logo" | "logo-name" | "name";
  metaTitle: string;
  metaDescription: string;
  baseUrl: string;
  apiKeyPrefix: string;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  siteName: siteConfig.brandName,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  logoUrl: "",
  faviconUrl: "",
  logoMode: "logo-name",
  metaTitle: `${siteConfig.brandName} AI Gateway - Premium AI Models. One API.`,
  metaDescription: siteConfig.description,
  baseUrl: siteConfig.baseUrl,
  apiKeyPrefix: "xpgw_",
};

const STORAGE_KEY = "site";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Merged site settings (DB overrides defaults). Cached per request; falls back to defaults if DB is unavailable. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: STORAGE_KEY },
    });
    if (row && isRecord(row.value)) {
      return {
        ...SITE_SETTINGS_DEFAULTS,
        ...row.value,
      };
    }
  } catch {
    // DB unavailable -> defaults keep the site renderable.
  }
  return SITE_SETTINGS_DEFAULTS;
});

/** Persist settings (merged over current stored value). */
export async function saveSiteSettings(
  next: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const merged: SiteSettings = {
    ...current,
    ...next,
    tagline: next.tagline ?? current.tagline,
    description: next.description ?? current.description,
  };
  await prisma.siteSetting.upsert({
    where: { key: STORAGE_KEY },
    create: { key: STORAGE_KEY, value: merged as unknown as Prisma.InputJsonValue },
    update: { value: merged as unknown as Prisma.InputJsonValue },
  });
  return merged;
}
