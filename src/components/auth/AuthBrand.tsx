"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/BrandLogo";
import { useSiteConfig } from "@/lib/use-site-config";
import { siteConfig } from "@/lib/site-config";

/**
 * Brand header untuk halaman auth (login/register/forgot/reset/verify).
 * Mengambil site config via /api/site/config — sama seperti BrandMark di AppShell.
 */
export default function AuthBrand() {
  const siteCfg = useSiteConfig();

  return (
    <Link href="/" className="flex items-center gap-2.5 mb-8 transition-opacity hover:opacity-90">
      {(!siteCfg.loaded || siteCfg.logoMode !== "name") && <BrandLogo size="lg" siteCfg={siteCfg} />}
      {!siteCfg.loaded ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        siteCfg.logoMode !== "logo" && (
          <span className="text-xl font-bold">{siteCfg.siteName || siteConfig.brandName}</span>
        )
      )}
    </Link>
  );
}
