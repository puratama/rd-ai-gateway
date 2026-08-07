"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site-config";

export interface PublicSiteConfig {
  siteName: string;
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  logoUrl: string;
  supportUrl: string;
  baseUrl: string;
}

const FALLBACK: PublicSiteConfig = {
  siteName: siteConfig.brandName,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  logoUrl: "",
  supportUrl: siteConfig.supportUrl,
  baseUrl: siteConfig.baseUrl,
};

export function useSiteConfig(): PublicSiteConfig {
  const [cfg, setCfg] = useState<PublicSiteConfig>(FALLBACK);

  useEffect(() => {
    let active = true;
    fetch("/api/site/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && active) setCfg(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return cfg;
}