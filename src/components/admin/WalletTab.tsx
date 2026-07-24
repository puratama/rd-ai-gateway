"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Wallet, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WalletItem {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  balance: number;
  billingCount: number;
  usageCount: number;
  monthlySpend: number;
  updatedAt: string;
}

interface WalletsResponse {
  wallets: WalletItem[];
  total: number;
  page: number;
  limit: number;
}

const fmtRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function WalletTab() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWallets = useCallback(async (term: string, p: number, l: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l) });
      if (term.trim()) params.set("search", term.trim());
      const res = await fetch(`/api/admin/wallets?${params}`);
      if (res.ok) {
        const data: WalletsResponse = await res.json();
        setWallets(data.wallets);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchWallets(search, page, limit), 300);
    return () => window.clearTimeout(timer);
  }, [fetchWallets, search, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Wallets</h1>
          <p className="text-sm text-muted-foreground">Monitor all user wallet balances and activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchWallets(search, page, limit)} className="cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="pl-9" />
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="animate-pulse">
            <div className="h-11 bg-muted/50" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 border-t border-border flex items-center gap-4 px-4">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No wallets found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">30d Spend</th>
                  <th className="px-4 py-3 text-right font-medium">Billings</th>
                  <th className="px-4 py-3 text-right font-medium">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.email}</div>
                      <div className="text-xs text-muted-foreground">{w.name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{w.role}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtRupiah(w.balance)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtRupiah(w.monthlySpend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.billingCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.usageCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>{total} total wallets</span>
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