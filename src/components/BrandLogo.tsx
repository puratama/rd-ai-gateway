"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { PublicSiteConfig } from "@/lib/use-site-config";
import { cn } from "@/lib/utils";

export function BrandLogo({ size = "md", siteCfg, className }: { size?: "md" | "lg"; siteCfg: PublicSiteConfig; className?: string }) {
  const box = size === "lg" ? "h-9 w-9 rounded-xl" : "h-8 w-8 rounded-lg";
  const icon = size === "lg" ? "h-4 w-4" : "h-4 w-4";

  if (!siteCfg.loaded) {
    return <Skeleton className={cn(box, className)} />;
  }

  if (!siteCfg.logoUrl) {
    return (
      <div className={cn(box, "relative flex items-center justify-center bg-linear-to-br from-primary to-accent shadow-sm ring-1 ring-inset ring-foreground/10", className)}>
        <svg className={cn(icon, "text-primary-foreground")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    );
  }

  // logo-only mode: fixed height, width auto
  const height = size === "lg" ? "h-9" : "h-8";
  const imgClass = siteCfg.logoMode === "logo" ? `${height} w-auto` : box;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={siteCfg.logoUrl} alt={siteCfg.siteName} className={cn(imgClass, "object-contain", className)} />;
}