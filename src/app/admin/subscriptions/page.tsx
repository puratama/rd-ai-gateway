"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Users,
  CalendarDays,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SubItem {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  planId: string;
  planName: string;
  price: number;
  billingPeriod: string;
  status: string;
  tokensUsed: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
}

function AdminSubscriptionsPageContent() {
  const [items, setItems] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setItems(data.subscriptions ?? data);
    } catch {
      setError("Failed to load");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const fmtDate = (ts: string) =>
    new Date(ts).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const fmtRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Subscriptions</h1>
            <p className="text-sm text-muted-foreground">
              Monitor user subscriptions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Tokens</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 text-center font-medium">Auto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    items.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.email}</div>
                          {s.name && (
                            <div className="text-xs text-muted-foreground">
                              {s.name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{s.planName}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {fmtRupiah(s.price)}
                          <span className="text-xs text-muted-foreground">
                            /{s.billingPeriod}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              s.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : s.status === "expired"
                                ? "bg-muted text-muted-foreground"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                s.status === "active"
                                  ? "bg-emerald-400"
                                  : s.status === "expired"
                                  ? "bg-muted-foreground"
                                  : "bg-destructive"
                              )}
                            />
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {s.tokensUsed.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.autoRenew ? (
                            <span className="text-[10px] text-emerald-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminSubscriptionsPageContent />
    </Suspense>
  );
}
