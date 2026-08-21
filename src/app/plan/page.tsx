"use client";

import { useEffect, useState } from "react";
import {
  Crown, Coins, RefreshCw, Wallet, Check, X,
  Gauge, Image as ImageIcon,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatCurrency } from "@/components/ui/format-currency";

interface CatalogPlan {
  id: string;
  name: string;
  description: string | null;
  billingPeriod: string;
  price: number;
  features: {
    maxTokensPerMonth: number;
    allowedModels: string[];
    allModels: boolean;
    allowedProviders: string[];
    allProviders: boolean;
    streaming: boolean;
    imageGeneration: boolean;
    highlights: string[];
  };
}

const fmtNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const billingLabel = (period: string) => {
  switch (period) {
    case "daily":
      return "1 hari";
    case "weekly":
      return "1 minggu";
    case "yearly":
      return "1 tahun";
    default:
      return "1 bulan";
  }
};

function FeatureRow({ icon, label, enabled }: { icon: React.ReactNode; label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon} {label}
      </span>
      {enabled ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      ) : (
        <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      )}
    </div>
  );
}

export default function PlanPage() {
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<CatalogPlan | null>(null);
  const [error, setError] = useState("");

  const loadBalance = async () => {
    try {
      const res = await fetch("/api/user/plans");
      if (res.ok) {
        const json = (await res.json()) as { balance?: number };
        setBalance(json.balance ?? 0);
      }
    } catch {
      // balance tidak kritis; halaman tetap berfungsi
    }
  };

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const json = (await res.json()) as { plans?: CatalogPlan[] };
      setPlans(json.plans ?? []);
    } catch {
      setError("Failed to load plans");
    }
    setLoading(false);
  };

  const buy = async (planId: string) => {
    setBuying(planId);
    setError("");
    try {
      const res = await fetch("/api/packages/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string | { message?: string };
        } | null;
        throw new Error(getApiErrorMessage(err, "Gagal membeli paket"));

      }
      toast.success("Paket berhasil dibeli.");
      await loadBalance();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membeli paket");
    } finally {
      setBuying(null);
    }
  };

  useEffect(() => { void loadBalance(); void loadCatalog(); }, []);

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4 text-primary" /> Token Plan
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Paket Token</h1>
              <p className="text-sm text-muted-foreground">Pilih paket token, bayar dari saldo wallet.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" /> Saldo: {formatCurrency(balance)}
              </span>
              <Link href="/my/wallet">
                <Button variant="outline" size="sm">Top up</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </header>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* Katalog */}
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
          ) : plans.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Belum ada paket tersedia"
              description="Belum ada paket token yang aktif dijual. Admin sedang menyiapkan paket — coba lagi nanti."
              action={
                <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
                  <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => {
                const models = plan.features.allModels
                  ? "Semua model"
                  : plan.features.allowedModels.length > 0
                    ? plan.features.allowedModels.join(", ")
                    : "Tanpa model";
                return (
                  <Card
                    key={plan.id}
                    className="animate-fade-in group relative overflow-hidden transition-all duration-300 group-hover"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <CardContent className="flex flex-col gap-4 p-5">
                      <div>
                        <p className="truncate text-xl font-semibold">{plan.name}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Harga</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                          {plan.price === 0 ? "Gratis" : formatCurrency(plan.price)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">Berlaku {billingLabel(plan.billingPeriod)}</p>
                      </div>

                      {plan.description && (
                        <p className="line-clamp-2 group-hover:line-clamp-none text-sm text-muted-foreground">{plan.description}</p>
                      )}

                      <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Maks. Token</span>
                          <span className="text-sm font-semibold tabular-nums">
                            {fmtNumber(plan.features.maxTokensPerMonth)}
                          </span>
                        </div>
                      </div>

                      {/* <div className="space-y-2 rounded-lg border border-border/70 bg-muted/25 p-3">
                        <FeatureRow icon={<Gauge className="h-3.5 w-3.5" />} label="Streaming" enabled={plan.features.streaming} />
                        <FeatureRow icon={<ImageIcon className="h-3.5 w-3.5" />} label="Image generation" enabled={plan.features.imageGeneration} />
                      </div> */}

                      {plan.features.highlights.length > 0 && (
                        <ul className="space-y-1.5">
                          {plan.features.highlights.map((h) => (
                            <li key={h} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        className="mt-auto w-full"
                        disabled={buying !== null}
                        onClick={() => setConfirmPlan(plan)}
                      >
                        Pilih Plan
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Konfirmasi pembelian */}
      <Dialog open={!!confirmPlan} onOpenChange={(o) => { if (!o) setConfirmPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembelian</DialogTitle>
            <DialogDescription>
              Beli paket <span className="font-medium text-foreground">{confirmPlan?.name}</span> seharga{" "}
              <span className="font-medium text-foreground">
                {confirmPlan?.price === 0 ? "Gratis" : formatCurrency(confirmPlan?.price ?? 0)}
              </span>
              ? Biaya akan dipotong langsung dari saldo wallet kamu (saldo saat ini: {formatCurrency(balance)}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPlan(null)}>Batal</Button>
            <Button
              disabled={buying !== null}
              onClick={() => {
                const plan = confirmPlan;
                setConfirmPlan(null);
                if (plan) void buy(plan.id);
              }}
            >
              <Coins className="h-3.5 w-3.5" /> {buying !== null ? "Memproses..." : "Ya, Beli"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
