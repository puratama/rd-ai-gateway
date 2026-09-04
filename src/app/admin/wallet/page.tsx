"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Wallet, Search, Edit3 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogBody,
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


/**
 * Format angka mentah (string digit, mungkin ada `-` di awal) menjadi display terformat.
 * Hanya untuk display — tidak memodifikasi state. Cursor dikendalikan oleh onChange.
 */
const formatAmount = (value: string) => {
  const negative = value.startsWith("-");
  const digits = value.replace(/^-?/, "").replace(/\D/g, "");
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
    // Parse dari display terformat (misal "100.000" → 100000)
    const value = Number(amount.replace(/\./g, "").replace(/,/g, ""));
    if (!Number.isFinite(value) || value === 0) {
      toast.error("Masukkan nominal saldo selain 0");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingWallet.userId, amount: value, description: "Admin topup" }),
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Wallets</h1>
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
          <TableSkeleton rows={5} cols={7} />
        ) : wallets.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No wallets found"
            description={search.trim() ? "Tidak ada wallet yang cocok dengan pencarian." : "Belum ada user dengan wallet."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/50 text-left text-muted-foreground">
                  <TableRow>
                    <TableHead className="px-4 py-3 font-medium">User</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Role</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium">Balance</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium">30d Spend</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium">Billings</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium">Requests</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium sr-only">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {wallets.map((w) => (
                    <TableRow key={w.id} className="hover:bg-muted/40">
                      <TableCell className="px-4 py-3">
                        <div className="font-medium">{w.email}</div>
                        <div className="text-xs text-muted-foreground">{w.name || "—"}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 capitalize text-muted-foreground">{w.role}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(w.balance)}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(w.monthlySpend)}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.billingCount}</TableCell>
                      <TableCell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{w.usageCount.toLocaleString()}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => { setEditingWallet(w); setAmount(""); }} aria-label={`Update saldo ${w.email}`} title="Update saldo">
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} pageCount={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
      <Dialog open={!!editingWallet} onOpenChange={(open) => { if (!open) setEditingWallet(null); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Update Saldo Wallet</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">{editingWallet?.email} · saldo saat ini {editingWallet ? formatCurrency(editingWallet.balance) : ""}</DialogDescription>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-2">
              <Label htmlFor="wallet-amount">Perubahan saldo (IDR)</Label>
              <Input id="wallet-amount" className="bg-background" type="text" inputMode="numeric" value={formatAmount(amount)} onChange={(event) => setAmount(formatAmount(event.target.value))} placeholder="Contoh: 100.000 atau -50.000" autoFocus />
              <p className="text-xs text-muted-foreground">Gunakan angka negatif untuk mengurangi saldo.</p>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingWallet(null)}>Batal</Button>
              <Button onClick={updateBalance} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
