"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BalanceResponse = { balance: number };
type TopupResponse = { transaction: { token: string; redirectUrl?: string } };
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
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("25000");
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [billing, setBilling] = useState<BillingRecord[]>([]);

  const numericAmount = useMemo(() => Number(amount), [amount]);

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

  async function handleTopup() {
    if (!Number.isFinite(numericAmount) || numericAmount < 10000) {
      setMessage("Enter at least Rp10.000.");
      return;
    }
    if (!window.snap) {
      alert("Payment window is not ready. Please refresh and try again.");
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
      if (!response.ok) throw new Error("Failed to start top up.");

      const data = (await response.json()) as TopupResponse;
      window.snap.pay(data.transaction.token, {
        onSuccess: () => {
          loadBalance();
          loadBilling();
          setMessage("Top up successful. Balance updated.");
          alert("Top up successful.");
        },
        onPending: () => setMessage("Top up pending. We will update your balance after payment is confirmed."),
        onError: () => setMessage("Payment failed. Please try again."),
        onClose: () => setMessage("Payment window closed."),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start top up.");
    } finally {
      setTopupLoading(false);
    }
  }

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Wallet className="h-4 w-4" /> Wallet
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Top up wallet</h1>
            <p className="text-sm text-zinc-400">Add balance to keep your API usage running.</p>
          </div>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Current balance</p>
                <div className="mt-2 text-4xl font-semibold tracking-tight">
                  {loading ? "Loading..." : rupiah.format(balance)}
                </div>
              </div>
              <Button variant="outline" onClick={() => loadBalance()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}
            {message && <p className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200">{message}</p>}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-lg font-semibold">Choose amount</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {presets.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={numericAmount === value ? "default" : "outline"}
                    className="h-11"
                    onClick={() => setAmount(String(value))}
                  >
                    {rupiah.format(value)}
                  </Button>
                ))}
              </div>
              <label className="mt-5 block text-sm font-medium text-zinc-300" htmlFor="custom-amount">
                Custom amount
              </label>
              <Input
                id="custom-amount"
                inputMode="numeric"
                min={10000}
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 h-11 bg-zinc-950"
              />
              <Button className="mt-5 h-11 w-full" onClick={handleTopup} disabled={topupLoading || loading}>
                <Plus className="h-4 w-4" /> {topupLoading ? "Starting payment..." : "Top Up"}
              </Button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-lg font-semibold">Recent transactions</h2>
              <div className="mt-4 space-y-3">
                {billingLoading ? <p className="text-sm text-zinc-400">Loading transactions...</p> : null}
                {!billingLoading && billing.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">No recent transactions yet.</p>
                ) : null}
                {billing.slice(0, 5).map((item, index) => (
                  <div key={item.id ?? item.midtransOrderId ?? `${item.createdAt}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.type ?? "Wallet top up"}</p>
                        <p className="mt-1 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("id-ID")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{rupiah.format(item.amount)}</p>
                        <p className="mt-1 text-xs uppercase text-zinc-400">{item.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
