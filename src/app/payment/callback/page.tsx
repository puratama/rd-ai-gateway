"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  Wallet,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatCurrency } from "@/components/ui/format-currency";

type PaymentStatus = "success" | "pending" | "failed" | "cancelled" | "unknown";

type ConfirmResponse = {
  status?: string;
  balance?: number;
  error?: unknown;
};

const REDIRECT_SECONDS = 5;


function normalizeStatus(raw: string | null): PaymentStatus {
  const value = (raw || "").toLowerCase();
  if (["success", "paid", "settlement", "capture", "completed"].includes(value)) return "success";
  if (["pending", "challenge", "authorize"].includes(value)) return "pending";
  if (["failed", "deny", "error", "expire", "expired", "refund"].includes(value)) return "failed";
  if (["cancel", "cancelled", "close", "closed"].includes(value)) return "cancelled";
  return "unknown";
}

function statusCopy(status: PaymentStatus) {
  switch (status) {
    case "success":
      return {
        title: "Pembayaran Berhasil",
        description: "Top up kamu sudah dikonfirmasi. Saldo wallet akan segera diperbarui.",
        icon: CheckCircle2,
        tone: "text-emerald-500",
        bg: "bg-emerald-500/10",
      };
    case "pending":
      return {
        title: "Pembayaran Sedang Diproses",
        description: "Kami menunggu konfirmasi dari payment gateway. Saldo akan bertambah setelah pembayaran lunas.",
        icon: Clock3,
        tone: "text-amber-500",
        bg: "bg-amber-500/10",
      };
    case "failed":
      return {
        title: "Pembayaran Gagal",
        description: "Transaksi tidak berhasil. Tidak ada potongan saldo. Silakan coba top up lagi.",
        icon: XCircle,
        tone: "text-destructive",
        bg: "bg-destructive/10",
      };
    case "cancelled":
      return {
        title: "Pembayaran Dibatalkan",
        description: "Kamu menutup atau membatalkan proses pembayaran. Tidak ada perubahan saldo.",
        icon: AlertTriangle,
        tone: "text-muted-foreground",
        bg: "bg-muted",
      };
    default:
      return {
        title: "Status Pembayaran Tidak Diketahui",
        description: "Kami belum bisa memastikan status transaksi. Cek riwayat di halaman wallet.",
        icon: AlertTriangle,
        tone: "text-muted-foreground",
        bg: "bg-muted",
      };
  }
}

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = useMemo(
    () => normalizeStatus(searchParams.get("status")),
    [searchParams]
  );
  const orderId = searchParams.get("orderId") || searchParams.get("order_id") || "";
  const provider = searchParams.get("provider") || "";

  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [balance, setBalance] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [error, setError] = useState("");

  const confirmPayment = useCallback(async () => {
    if (!orderId) return;
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/topup/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as ConfirmResponse;
      if (!res.ok) {
        throw new Error(getApiErrorMessage(data, "Gagal mengonfirmasi pembayaran."));
      }

      if (typeof data.balance === "number") setBalance(data.balance);

      if (data.status === "paid") setStatus("success");
      else if (data.status === "pending") setStatus("pending");
      else if (data.status === "failed" || data.status === "expired") setStatus("failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal mengonfirmasi pembayaran.");
      // Keep initial status from query if confirm fails
    } finally {
      setConfirming(false);
    }
  }, [orderId]);

  // Confirm success/unknown (with orderId) so balance is credited even if webhook lags
  useEffect(() => {
    if (!orderId) return;
    if (initialStatus === "success" || initialStatus === "unknown" || initialStatus === "pending") {
      confirmPayment();
    }
  }, [orderId, initialStatus, confirmPayment]);

  // Countdown then go to wallet
  useEffect(() => {
    if (confirming) return;
    if (secondsLeft <= 0) {
      router.replace("/my/wallet");
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, confirming, router]);

  const copy = statusCopy(status);
  const Icon = copy.icon;

  return (
    <AppShell variant="user">
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 p-8 text-center">
            <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full", copy.bg)}>
              {confirming ? (
                <Loader2 className={cn("h-8 w-8 animate-spin", copy.tone)} />
              ) : (
                <Icon className={cn("h-8 w-8", copy.tone)} />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {confirming ? "Mengonfirmasi Pembayaran..." : copy.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {confirming
                  ? "Mohon tunggu sebentar, kami sedang memperbarui saldo wallet kamu."
                  : copy.description}
              </p>
            </div>

            {status === "success" && balance !== null && (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Saldo wallet saat ini</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(balance)}</p>
              </div>
            )}

            {(orderId || provider) && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {orderId && <p>Order ID: <span className="font-mono text-foreground">{orderId}</span></p>}
                {provider && <p>Provider: <span className="capitalize text-foreground">{provider}</span></p>}
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {confirming
                  ? "Mengalihkan setelah konfirmasi selesai..."
                  : `Kembali ke wallet dalam ${secondsLeft} detik`}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => router.replace("/my/wallet")} className="gap-2">
                  <Wallet className="h-4 w-4" /> Ke Wallet Sekarang
                </Button>
                {status !== "success" && (
                  <Button variant="outline" onClick={() => router.replace("/my/wallet")}>
                    Coba Top Up Lagi
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <AppShell variant="user">
          <div className="flex h-full items-center justify-center p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat status pembayaran...
            </div>
          </div>
        </AppShell>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
