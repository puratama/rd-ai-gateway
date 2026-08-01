"use client";

import { useEffect, useState } from "react";
import { Crown, Coins, RefreshCw, CalendarDays, Wallet, Package } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PlanInfo {
  id: string;
  name: string;
  description: string | null;
  billingPeriod: string;
  price: number;
  maxTokensPerPeriod: number;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  tokensUsed: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  plan: PlanInfo;
}

interface PackageInfo {
  id: string;
  status: string;
  tokensRemaining: number;
  tokensTotal: number;
  expiresAt: string;
  createdAt: string;
  plan: PlanInfo;
}

interface PlansResponse {
  subscription: SubscriptionInfo | null;
  packages: PackageInfo[];
  balance: number;
}

const fmtRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function Progress({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    depleted: "bg-amber-500/10 text-amber-400",
    expired: "bg-muted/20 text-muted-foreground",
    cancelled: "bg-rose-500/10 text-rose-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", map[status] ?? "bg-muted/20 text-muted-foreground")}>
      {status}
    </span>
  );
}

export default function PlanPage() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/plans");
      if (!res.ok) throw new Error("Failed to load plan data");
      setData(await res.json());
    } catch {
      setError("Failed to load plan data");
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const sub = data?.subscription;
  const packages = data?.packages ?? [];

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4 text-primary" /> Token Plan
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Token Plan</h1>
              <p className="text-sm text-muted-foreground">Status membership dan paket token kamu.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </header>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* Active subscription */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-4 w-4 text-primary" /> Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                </div>
              ) : sub ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Crown className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold">{sub.plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.plan.price === 0 ? "Gratis" : fmtRupiah(sub.plan.price)} / {sub.plan.billingPeriod}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Token terpakai</span>
                      <span className="tabular-nums">
                        {fmtNumber(sub.tokensUsed)} / {fmtNumber(sub.plan.maxTokensPerPeriod)}
                      </span>
                    </div>
                    <Progress used={sub.tokensUsed} total={sub.plan.maxTokensPerPeriod} />
                  </div>

                  <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" /> Berlaku s.d. {fmtDate(sub.endDate)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" /> Token/{sub.plan.billingPeriod}
                    </div>
                    <div className="flex items-center gap-2">
                      <Coins className="h-3.5 w-3.5" /> Auto-renew: {sub.autoRenew ? "Ya" : "Tidak"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 py-2">
                  <p className="text-sm text-muted-foreground">Belum ada subscription aktif. Kamu memakai plan gratis / PAYG.</p>
                  <Link href="/models">
                    <Button size="sm">Lihat Model</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token packages */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package className="h-4 w-4" /> Token Plans ({packages.length})
              </div>
              <Link href="/wallet" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Wallet className="h-3.5 w-3.5" /> Top up / Beli paket
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="space-y-3 p-5">
                      <div className="h-4 w-2/3 rounded bg-muted" />
                      <div className="h-2 w-full rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : packages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                  <Coins className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">Belum ada paket token</p>
                  <p className="text-xs text-muted-foreground/70">Beli paket token untuk tarif lebih hemat.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((p) => {
                  const pct = p.tokensTotal > 0 ? Math.round((p.tokensRemaining / p.tokensTotal) * 100) : 0;
                  return (
                    <Card key={p.id}>
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{p.plan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.plan.price === 0 ? "Gratis" : fmtRupiah(p.plan.price)}
                            </p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Sisa token</span>
                            <span className="tabular-nums">{fmtNumber(p.tokensRemaining)} / {fmtNumber(p.tokensTotal)}</span>
                          </div>
                          <Progress used={p.tokensTotal - p.tokensRemaining} total={p.tokensTotal} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDate(p.expiresAt)}</span>
                          <span className="tabular-nums">{pct}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
