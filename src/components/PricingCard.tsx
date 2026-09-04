import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { PricingTier } from "@/lib/pricing-tiers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Kartu tier harga; tier populer diberi ring primary + badge. */
export function PricingCard({
  tier: t,
  isAuthenticated,
  className,
  style,
}: {
  tier: PricingTier;
  isAuthenticated: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card
      style={{ "--card-spacing": "0px", ...style } as React.CSSProperties}
      className={cn(
        "p-0 transition-all duration-200",
        t.popular
          ? "ring-2 ring-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--color-primary)_10%,transparent)]"
          : "hover:-translate-y-0.5 hover:ring-primary/50 hover:bg-card/80 hover:shadow-[0_8px_30px_-12px_color-mix(in_oklch,var(--color-primary)_25%,transparent)]",
        className
      )}
    >
      <div className="flex h-full flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">{t.name}</h3>
          {t.popular && <Badge>Populer</Badge>}
        </div>

        {t.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{t.description}</p>
        )}

        <div>
          <div className="text-4xl font-bold tracking-tight lg:text-4xl">{t.price}</div>
          <p className="mt-2 text-sm text-muted-foreground">{t.billingPeriod}</p>
        </div>

        {t.features.length > 0 && (
          <ul className="space-y-3 border-t border-border/40 pt-5 text-sm">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        )}

        <Button
          render={<Link href={isAuthenticated ? "/my/plan" : "/register"} />}
          nativeButton={false}
          // variant={t.popular ? "default" : "outline"}
          variant="default"
          className="mt-auto w-full"
        >
          {t.cta} <ArrowUpRight />
        </Button>
      </div>
    </Card>
  );
}
