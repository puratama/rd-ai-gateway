"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CreditCard, CheckCircle2, XCircle, Eye } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency } from "@/components/ui/format-currency";
import { formatDateTime } from "@/components/ui/format-date";

interface PaymentRecord {
  id: string;
  type: string;
  amount: number;
  status: string;
  provider: string | null;
  proofNote: string | null;
  proofImage: string | null;
  orderId: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}


function statusLabel(status: string) {
  switch (status) {
    case "pending_confirmation":
      return { text: "Menunggu Verifikasi", cls: "bg-amber-500/10 text-amber-600" };
    case "paid":
      return { text: "Dibayar", cls: "bg-emerald-500/10 text-emerald-600" };
    case "failed":
      return { text: "Ditolak", cls: "bg-destructive/10 text-destructive" };
    default:
      return { text: status, cls: "bg-muted text-muted-foreground" };
  }
}

export default function AdminPaymentsPage() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending_confirmation");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?filter=${filter}`);
      if (res.status === 401 || res.status === 403) {
        setError("Access denied — superadmin role required");
      } else if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setError("");
      } else {
        setError("Gagal memuat pembayaran");
      }
    } catch {
      setError("Gagal memuat pembayaran");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Gagal memproses" }));
        throw new Error(getApiErrorMessage(err, "Gagal memproses"));
      }
      toast.success(decision === "approve" ? "Pembayaran disetujui, saldo ditambahkan" : "Pembayaran ditolak");
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setDetail((prev) => (prev?.id === id ? null : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses");
    }
    setBusyId(null);
  }

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Verifikasi Pembayaran</h1>
            <p className="text-sm text-muted-foreground">
              Konfirmasi manual pembayaran QRIS merchant (tanpa webhook).
            </p>
          </div>
          <Button variant="outline" onClick={fetchRecords} className="cursor-pointer" aria-label="Refresh payments" title="Refresh payments">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs
          items={[
            { value: "pending_confirmation", label: "Menunggu Verifikasi" },
            { value: "pending", label: "Pending" },
            { value: "all", label: "Semua" },
          ]}
          value={filter}
          onValueChange={setFilter}
          ariaLabel="Payment filter"
        />

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Tidak ada pembayaran"
            description="Tidak ada pembayaran yang perlu diverifikasi."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((r) => {
                    const status = statusLabel(r.status);
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.user.name ?? r.user.email}</p>
                          <p className="text-xs text-muted-foreground">{r.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={"rounded-full px-2 py-0.5 text-xs " + status.cls}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setDetail(r)}>
                            <Eye className="h-4 w-4" /> Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}>
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <DialogTitle className="text-base">Detail Pembayaran</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {detail?.user.name ?? detail?.user.email ?? "Pembayaran"}
              </DialogDescription>
            </div>
            {detail && (
              <div className="max-h-[70vh] overflow-y-auto space-y-3 p-6">
                {(() => {
                  const status = statusLabel(detail.status);
                  return (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className={"rounded-full px-2 py-0.5 text-xs " + status.cls}>
                        {status.text}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {formatCurrency(detail.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipe</span>
                  <span className="capitalize">{detail.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Provider</span>
                  <span>{detail.provider ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground shrink-0">Dibuat</span>
                  <span className="text-right">{formatDateTime(detail.createdAt)}</span>
                </div>
                {detail.orderId && (
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground shrink-0">Order</span>
                    <span className="text-right font-mono text-xs break-all">{detail.orderId}</span>
                  </div>
                )}
                {detail.proofNote && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-medium text-muted-foreground">Catatan</p>
                    <p className="mt-1 text-sm">{detail.proofNote}</p>
                  </div>
                )}
                {detail.proofImage && (
                  <div className="rounded-lg border border-border bg-background p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.proofImage}
                      alt="Bukti transfer"
                      className="max-h-72 w-full cursor-pointer rounded-md object-contain transition hover:opacity-80"
                      onClick={() => window.open(detail.proofImage!, "_blank")}
                    />
                  </div>
                )}
                {detail.status === "pending_confirmation" && (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1" onClick={() => review(detail.id, "approve")} disabled={busyId === detail.id}>
                      <CheckCircle2 className="h-4 w-4" /> Setujui
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => review(detail.id, "reject")}
                      disabled={busyId === detail.id}
                    >
                      <XCircle className="h-4 w-4" /> Tolak
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}