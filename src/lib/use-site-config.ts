"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site-config";

export interface PublicSiteConfig {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  logoMode: "logo" | "logo-name" | "name";
  baseUrl: string;
  loaded: boolean;
}

const FALLBACK: PublicSiteConfig = {
  siteName: siteConfig.brandName,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  logoUrl: "",
  logoMode: "logo-name",
  baseUrl: siteConfig.baseUrl,
  loaded: false,
};

export function useSiteConfig(): PublicSiteConfig {
  const [cfg, setCfg] = useState<PublicSiteConfig>(FALLBACK);

  useEffect(() => {
    let active = true;
    fetch("/api/site/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !active) return;
        // API same-origin di project ini → pakai origin browser.
        // Admin override hanya jika beda domain (API terpisah).
        const origin = window.location.origin;
        try {
          d.baseUrl =
            new URL(d.baseUrl).origin === origin
              ? `${origin}/api/v1`
              : d.baseUrl;
        } catch {
          d.baseUrl = `${origin}/api/v1`;
        }
        setCfg({ ...d, loaded: true });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCfg((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  return cfg;
}
