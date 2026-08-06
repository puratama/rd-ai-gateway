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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" /> Token Plan
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">My Plan</h1>
              <p className="text-sm text-muted-foreground">Paket token dan saldo Anda.</p>
            </div>
            <Link href="/plan" className={cn(buttonVariants(), "gap-2")}>
              <CreditCard className="h-4 w-4" /> Beli Token
            </Link>
          </header>

          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-3 h-9 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-3 w-28" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Ringkasan */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4 text-blue-500" /> Saldo Wallet
                    </div>
                    <div className="mt-3 text-3xl font-semibold tabular-nums">{fmtRupiah(data!.balance)}</div>
                    <Link href="/my/wallet" className={cn(buttonVariants({ variant: "link", size: "sm" }), "gap-1 px-0 text-xs")}>
                      Top up <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Coins className="h-4 w-4 text-emerald-500" /> Paket Aktif
                    </div>
                    <div className="mt-3 text-3xl font-semibold tabular-nums">{data!.packages.length}</div>
                    <p className="mt-1 text-xs text-muted-foreground">total paket token Anda</p>
                  </CardContent>
                </Card>
              </div>

              {/* Packages */}
              <section>
                <h2 className="mb-3 text-sm font-semibold">Paket Token</h2>
                {data!.packages.length === 0 ? (
                  <EmptyState
                    icon={Coins}
                    title="Belum ada paket token"
                    description="Beli dari halaman Token Plan untuk mulai memakai langganan token."
                  />
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
