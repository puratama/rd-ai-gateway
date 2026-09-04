import type { PublicModelInfo } from "@/lib/use-site-config";
import { formatPrice, priceLabel } from "@/lib/pricing-tiers";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Kartu katalog model: nama, modelId, tarif PAYG + info paket token. */
export function ModelCard({
  model: m,
  className,
  style,
}: {
  model: PublicModelInfo;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Card
      interactive
      style={{ "--card-spacing": "0px", ...style } as React.CSSProperties}
      className={cn("p-0", className)}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug tracking-tight">{m.name}</h3>
        </div>
        <p className="-mt-2 truncate font-mono text-xs text-muted-foreground">{m.modelId}</p>

        <dl className="space-y-2 border-t border-border/40 pt-4 text-sm">
          {m.maxOutputTokens != null && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Maks. output</dt>
              <dd className="font-mono text-sm font-medium tabular-nums">
                {m.maxOutputTokens.toLocaleString("id-ID")}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Input / 1K</dt>
            <dd className="font-mono text-sm font-medium tabular-nums">{priceLabel(m.paygPrompt)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Output / 1K</dt>
            <dd className="font-mono text-sm font-medium tabular-nums">{priceLabel(m.paygCompletion)}</dd>
          </div>
        </dl>

        {m.planPrompt != null && (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {m.planPrompt === 0
              ? "Termasuk dalam paket token"
              : `Paket token: Rp ${formatPrice(m.planPrompt)} / 1K input`}
          </p>
        )}
      </div>
    </Card>
  );
}
