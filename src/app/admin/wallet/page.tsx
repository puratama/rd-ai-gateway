"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wallet, Search, Pencil } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/components/ui/format-currency";

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


const formatAmount = (value: string) => {
  const negative = value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  return digits ? `${negative ? "-" : ""}${Number(digits).toLocaleString("id-ID")}` : negative ? "-" : "";
};

export default function AdminWalletPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

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
    } catch {
      // Ignore failed wallet requests.
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchWallets(search, page, limit), 300);
    return () => window.clearTimeout(timer);
  }, [fetchWallets, search, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateBalance = async () => {
    if (!editingWallet) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value === 0) {
      toast.error("Masukkan nominal saldo selain 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingWallet.userId, amount: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengupdate saldo");
      setEditingWallet(null);
      setAmount("");
      await fetchWallets(search, page, limit);
      toast.success("Saldo wallet berhasil diupdate");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengupdate saldo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Wallets</h1>
            <p className="text-sm text-muted-foreground">Monitor all user wallet balances and activity.</p>
          </div>
          <Button variant="outline" size="icon-lg" onClick={() => fetchWallets(search, page, limit)} aria-label="Refresh wallets" title="Refresh wallets">
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
          <EmptyState
            icon={Wallet}
            title="No wallets found"
            description={search.trim() ? "Tidak ada wallet yang cocok dengan pencarian." : "Belum ada user dengan wallet."}
          />
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
                    <th className="px-4 py-3 text-right font-medium sr-only">Action</th>
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
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(w.balance)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(w.monthlySpend)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.billingCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.usageCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="icon-sm" onClick={() => { setEditingWallet(w); setAmount(""); }} aria-label={`Update saldo ${w.email}`} title="Update saldo">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
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
      <Dialog open={!!editingWallet} onOpenChange={(open) => { if (!open) setEditingWallet(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Saldo Wallet</DialogTitle>
            <DialogDescription>{editingWallet?.email} · saldo saat ini {editingWallet ? formatCurrency(editingWallet.balance) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wallet-amount">Perubahan saldo (IDR)</Label>
            <Input id="wallet-amount" className="bg-background" type="text" inputMode="numeric" value={formatAmount(amount)} onChange={(event) => setAmount(event.target.value.replace(/\D/g, "") ? `${event.target.value.trim().startsWith("-") ? "-" : ""}${event.target.value.replace(/\D/g, "")}` : event.target.value.trim().startsWith("-") ? "-" : "")} placeholder="Contoh: 100.000 atau -50.000" autoFocus />
            <p className="text-xs text-muted-foreground">Gunakan angka negatif untuk mengurangi saldo.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWallet(null)}>Batal</Button>
            <Button onClick={updateBalance} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
