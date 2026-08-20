"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Key,
  CreditCard,
  TrendingUp,
  Package,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton, StatsCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AppShell from "@/components/layout/AppShell";
import { formatCurrency } from "@/components/ui/format-currency";

interface AdminStats {
  overview: { totalKeys: number; activeKeys: number; usedKeys: number; totalRequests: number; totalTokens: number; todayTokens: number; todayRequests: number };
  revenue: { totalRevenue: number; pendingRevenue: number; completedPayments: number; pendingPayments: number; byType: { package: number; topup: number } };
  packages: { total: number; active: number; byPlan: Record<string, number> };
  providers: Record<string, number>;
  dailyUsage: Record<string, number>;
  topModels: { model: string; tokens: number; requests: number }[];
}

function AdminPageContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else if (res.status === 401 || res.status === 403) {
        setError("Access denied — superadmin role required");
      }
    } catch {
      setError("Failed to load stats");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  };


  if (loading) {
    return (
      <AppShell variant="admin">
        <div className="h-full overflow-auto p-6 space-y-6">
          <CardGridSkeleton count={4} />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <ChartSkeleton />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!stats && !error && (
          <EmptyState
            icon={LayoutDashboard}
            title="No Data"
            description="Configure INTERNAL_API_KEY to access admin"
          />
        )}

        {stats && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Overview of platform metrics.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-medium text-muted-foreground">Active Keys</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overview.activeKeys}</div>
                  <p className="text-xs text-muted-foreground">{stats.overview.totalKeys} total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Requests</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.overview.totalRequests)}</div>
                  <p className="text-xs text-muted-foreground">{formatNumber(stats.overview.todayRequests)} today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Tokens</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stats.overview.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">{formatNumber(stats.overview.todayTokens)} today</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.revenue.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">{stats.revenue.completedPayments} payments</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {stats.revenue.totalRevenue === 0 && stats.revenue.completedPayments === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No revenue yet"
                      description="Belum ada pembayaran yang terekam."
                    />
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold">{formatCurrency(stats.revenue.totalRevenue)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="text-amber-500">{formatCurrency(stats.revenue.pendingRevenue)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="text-emerald-500">{stats.revenue.completedPayments}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pending Payments</span><span className="text-amber-500">{stats.revenue.pendingPayments}</span></div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue by Source</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(!stats.revenue.byType?.package && !stats.revenue.byType?.topup) || (stats.revenue.byType?.package ?? 0) === 0 && (stats.revenue.byType?.topup ?? 0) === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title="No source data"
                      description="Belum ada sumber pendapatan teridentifikasi."
                    />
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Package Purchase</span><span className="font-semibold">{formatCurrency(stats.revenue.byType?.package ?? 0)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Wallet Topup</span><span className="font-semibold">{formatCurrency(stats.revenue.byType?.topup ?? 0)}</span></div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Active Packages</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {stats.packages.total === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No packages active"
                      description="Tidak ada paket token yang aktif di sistem."
                    />
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{stats.packages.total}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="text-emerald-500">{stats.packages.active}</span></div>
                      {Object.entries(stats.packages.byPlan).map(([planId, count]) => (
                        <div key={planId} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{planId}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Top Models by Usage</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {(stats.topModels ?? []).length === 0 ? (
                    <EmptyState
                      icon={BarChart3}
                      title="No usage data yet"
                      description="Belum ada model yang mencatat penggunaan."
                    />
                  ) : (
                    (stats.topModels ?? []).map((m, i) => {
                      const maxTokens = stats.topModels?.[0]?.tokens ?? 1;
                      return (
                        <div key={m.model} className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <span className="font-medium truncate">{m.model}</span>
                              <span className="text-muted-foreground tabular-nums shrink-0">{formatNumber(m.tokens)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${(m.tokens / maxTokens) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Daily Usage (30 days)</CardTitle></CardHeader>
              <CardContent>
                {Object.values(stats.dailyUsage).every((count) => count === 0) ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No usage in last 30 days"
                    description="Belum ada aktivitas tokens dalam periode 30 hari terakhir."
                  />
                ) : (
                  <div className="flex items-end gap-1 h-32">
                    {Object.entries(stats.dailyUsage).map(([date, count]) => {
                      const maxVal = Math.max(...Object.values(stats.dailyUsage), 1);
                      const height = (count / maxVal) * 100;
                      const isToday = date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                          <div
                            className={cn(
                              "w-full rounded-t transition-all",
                              isToday ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20"
                            )}
                            style={{ height: `${Math.max(height, count > 0 ? 4 : 1)}%` }}
                          />
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                            {date}: {formatNumber(count)} tokens
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
