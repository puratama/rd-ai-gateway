"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  createdAt: string;
}

interface SubsResponse {
  subscriptions: SubItem[];
  total: number;
  page: number;
  limit: number;
}

const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const fmtRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();

const STATUS_OPTIONS = ["active", "expired", "cancelled"];

export default function SubscriptionsTab() {
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data: SubsResponse = await res.json();
        setSubs(data.subscriptions);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, limit, statusFilter]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <p className="text-xs text-muted-foreground">View and monitor all user subscriptions.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchSubs} className="cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No subscriptions found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens Used</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 text-center font-medium">Auto-Renew</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.email}</div>
                      <div className="text-xs text-muted-foreground">{s.name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 capitalize font-medium">{s.planName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtRupiah(s.price)}/{s.billingPeriod}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        s.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                        s.status === "expired" ? "bg-amber-500/10 text-amber-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          s.status === "active" ? "bg-emerald-400" :
                          s.status === "expired" ? "bg-amber-400" :
                          "bg-muted-foreground"
                        )} />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtNum(s.tokensUsed)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xs", s.autoRenew ? "text-emerald-400" : "text-muted-foreground")}>
                        {s.autoRenew ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>{total} total subscriptions</span>
            <div className="flex items-center gap-2">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">Prev</Button>
                <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs">Next</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}