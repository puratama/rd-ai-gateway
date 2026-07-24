"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BalanceResponse = { balance: number };
type TopupResponse = { transaction?: { token: string; redirectUrl?: string; provider?: string; orderId?: string }; devMode?: boolean; note?: string; billing?: Record<string, unknown> };
type BillingRecord = {
  id?: string;
  type?: string;
  amount: number;
  status: string;
  midtransOrderId?: string;
  createdAt: string;
};
type BillingResponse = BillingRecord[] | { data?: BillingRecord[]; billing?: BillingRecord[]; records?: BillingRecord[] };

type SnapCallbacks = {
  onSuccess: () => void;
  onPending: () => void;
  onError: () => void;
  onClose: () => void;
};

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

const presets = [10000, 25000, 50000, 100000, 250000];
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function parseBilling(input: BillingResponse): BillingRecord[] {
  if (Array.isArray(input)) return input;
  return input.data ?? input.billing ?? input.records ?? [];
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("25000");
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [snapReady, setSnapReady] = useState(false);

  const numericAmount = useMemo(() => Number(amount), [amount]);

  // Load Midtrans Snap script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.snap) { setSnapReady(true); return; }

    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "");
    script.async = true;
    script.onload = () => setSnapReady(true);
    script.onerror = () => console.warn("[wallet] Failed to load Midtrans Snap script");
    document.body.appendChild(script);

    return () => {
      // only remove if we added it
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  const loadBalance = useCallback(async () => {
    const response = await fetch("/api/wallet/balance");
    if (!response.ok) throw new Error("Failed to load wallet balance.");
    const data = (await response.json()) as BalanceResponse;
    setBalance(data.balance);
  }, []);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const response = await fetch("/api/v1/billing");
      if (!response.ok) {
        setBilling([]);
        return;
      }
      const data = (await response.json()) as BillingResponse;
      setBilling(parseBilling(data));
    } catch {
      setBilling([]);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        await loadBalance();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load wallet.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    loadBilling();

    return () => {
      active = false;
    };
  }, [loadBalance, loadBilling]);

  function goToCallback(status: string, orderId?: string, provider = "midtrans") {
    const params = new URLSearchParams({ status, provider });
    if (orderId) params.set("orderId", orderId);
    router.push(`/payment/callback?${params.toString()}`);
  }

  async function handleTopup() {
    if (!Number.isFinite(numericAmount) || numericAmount < 10000) {
      setMessage("Enter at least Rp10.000.");
      return;
    }

    setTopupLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Failed to start top up." }));
        throw new Error(err.error || "Failed to start top up.");
      }

      const data = (await response.json()) as TopupResponse;

      if (data.devMode) {
        goToCallback("success", undefined, "dev");
        return;
      }

      if (!data.transaction) {
        setMessage("No payment session returned. Please try again.");
        return;
      }

      const { token, redirectUrl, provider, orderId } = data.transaction;

      if (provider === "xendit") {
        if (!redirectUrl) throw new Error("Missing Xendit checkout URL.");
        window.location.href = redirectUrl;
        return;
      }

      // Midtrans Snap
      if (!window.snap || !snapReady) {
        setMessage("Payment window is still loading. Please wait a moment and try again.");
        return;
      }

      window.snap.pay(token, {
        onSuccess: () => goToCallback("success", orderId, "midtrans"),
        onPending: () => goToCallback("pending", orderId, "midtrans"),
        onError: () => goToCallback("failed", orderId, "midtrans"),
        onClose: () => goToCallback("cancelled", orderId, "midtrans"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start top up.");
    } finally {
      setTopupLoading(false);
    }
  }

  async function handleRefresh() {
    setError("");
    try {
      await loadBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet.");
    }
  }

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" /> Wallet
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Top up wallet</h1>
              <p className="text-sm text-muted-foreground">Add balance to keep your API usage running.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="cursor-pointer">
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
            </Button>
          </header>

          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current balance</p>
                  <div className="mt-2 text-4xl font-semibold tracking-tight">
                    {loading ? "Loading..." : rupiah.format(balance)}
                  </div>
                </div>
              </div>
              {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {message && <p className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">{message}</p>}
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold">Choose amount</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {presets.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={numericAmount === value ? "default" : "outline"}
                      className="h-11 animate-button"
                      onClick={() => setAmount(String(value))}
                    >
                      {rupiah.format(value)}
                    </Button>
                  ))}
                </div>
                <label className="mt-5 block text-sm font-medium text-foreground" htmlFor="custom-amount">
                  Custom amount
                </label>
                <Input
                  id="custom-amount"
                  inputMode="numeric"
                  min={10000}
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-2 h-11 bg-input"
                />
                <Button className="mt-5 h-11 w-full" onClick={handleTopup} disabled={topupLoading || loading}>
                  <Plus className="h-4 w-4" /> {topupLoading ? "Starting payment..." : "Top Up"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold">Recent transactions</h2>
                <div className="mt-4 space-y-3">
                  {billingLoading ? <p className="text-sm text-muted-foreground">Loading transactions...</p> : null}
                  {!billingLoading && billing.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No recent transactions yet.</p>
                  ) : null}
                  {billing.slice(0, 5).map((item, index) => (
                    <div key={item.id ?? item.midtransOrderId ?? `${item.createdAt}-${index}`} className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{item.type ?? "Wallet top up"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("id-ID")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{rupiah.format(item.amount)}</p>
                          <p className="mt-1 text-xs uppercase text-muted-foreground">{item.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
