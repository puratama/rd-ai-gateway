"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  Wallet,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UserPackage = {
  id: string;
  status: string;
  tokensRemaining: number;
  tokensTotal: number;
  expiresAt: string;
  createdAt: string;
  plan: PlanSummary;
};

type PlanSummary = {
  id: string;
  name: string;
  description: string | null;
  billingPeriod: string;
  price: number;
  maxTokensPerPeriod: number;
};

type MyPlanData = {
  packages: UserPackage[];
  balance: number;
};

const fmtRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

function TokenBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {fmtNumber(used)} / {fmtNumber(max)} token
        </span>
        <span className={cn("font-semibold tabular-nums", pct >= 90 ? "text-destructive" : "text-muted-foreground")}>{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
      ok ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}

export default function MyPlanPage() {
  const [data, setData] = useState<MyPlanData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/user/plans");
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load");
        const json = (await res.json()) as MyPlanData;
        setData({ packages: json.packages ?? [], balance: json.balance ?? 0 });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your plan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">My Plan</h1>
              <p className="text-sm text-muted-foreground">Paket token dan saldo Anda.</p>
            </div>
            <Link href="/plan" className={cn(buttonVariants(), "gap-2")}>
              <CreditCard className="h-4 w-4" /> Beli Token
            </Link>
          </div>

          {loading ? (
            <StatsCardSkeleton />
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Ringkasan */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Wallet</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">{fmtRupiah(data!.balance)}</p>
                    <Link href="/wallet" className={cn(buttonVariants({ variant: "link", size: "sm" }), "gap-1 px-0 text-xs")}>
                      Top up <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Paket Aktif</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">{data!.packages.length}</p>
                    <p className="text-xs text-muted-foreground">total paket token Anda</p>
                  </CardContent>
                </Card>
              </div>

              {/* Packages */}
              <section>
                <h2 className="mb-3 text-sm font-semibold">Paket Token</h2>
                {data!.packages.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada paket token. Beli dari halaman Token Plan.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {data!.packages.map((p) => {
                      const pct = p.tokensTotal > 0 ? Math.round((p.tokensRemaining / p.tokensTotal) * 100) : 0;
                      return (
                        <Card key={p.id}>
                          <CardContent className="space-y-3 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{p.plan.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fmtRupiah(p.plan.price)} · berlaku hingga {fmtDate(p.expiresAt)}
                                </p>
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                            <TokenBar used={p.tokensTotal - p.tokensRemaining} max={p.tokensTotal} />
                            <p className="text-xs text-muted-foreground">
                              Sisa {fmtNumber(p.tokensRemaining)} token ({pct}%)
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
