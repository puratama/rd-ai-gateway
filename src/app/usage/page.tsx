"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Coins, Hash, RefreshCw } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface ModelUsage {
  model: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface UsageResponse {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  range: string;
  byModel: ModelUsage[];
  byDay: DailyUsage[];
}

type RangeFilter = "week" | "month";

const RANGE_OPTIONS: { key: RangeFilter; label: string }[] = [
  { key: "week", label: "1 Week" },
  { key: "month", label: "1 Month" },
];

const RANGE_LABEL: Record<RangeFilter, string> = {
  week: "Last 7 days",
  month: "Last 30 days",
};

const RANGE_DAYS: Record<RangeFilter, number> = {
  week: 7,
  month: 30,
};

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID");

function shortDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** Generate ISO dates (UTC) for the full range, back-filling usage data */
function fillDays(range: RangeFilter, byDay: DailyUsage[]): DailyUsage[] {
  const count = RANGE_DAYS[range];
  const now = new Date();
  // Use UTC midnight to match API's dayKey() which uses toISOString (always UTC)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const map = new Map(byDay.map((d) => [d.date, d]));
  const result: DailyUsage[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(map.get(key) ?? { date: key, tokens: 0, cost: 0, requests: 0 });
  }
  return result;
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeFilter>("month");

  const loadUsage = useCallback(async (r: RangeFilter) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/user/usage?range=${r}`);
      if (!response.ok) throw new Error("Failed to load usage.");
      setUsage((await response.json()) as UsageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage(range);
  }, [range, loadUsage]);

  const days = useMemo(() => usage ? fillDays(range, usage.byDay) : [], [usage, range]);
  const maxTokens = Math.max(...days.map((day) => day.tokens), 1);

  const chartData = useMemo(() => ({
    labels: days.map((d) => shortDate(d.date)),
    datasets: [
      {
        label: "Tokens",
        data: days.map((d) => d.tokens),
        backgroundColor: "oklch(0.68 0.16 235)",
        borderRadius: 4,
        borderSkipped: false as const,
      },
    ],
  }), [days]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "oklch(0.265 0.062 247)",
        titleColor: "oklch(0.97 0.015 240)",
        bodyColor: "oklch(0.97 0.015 240)",
        borderColor: "oklch(0.39 0.065 246)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => items[0]?.label ?? "",
          label: (item: TooltipItem<"bar">) => {
            const day = days[item.dataIndex];
            if (!day) return "";
            return [
              `Tokens: ${number.format(day.tokens)}`,
              `Requests: ${number.format(day.requests)}`,
              day.cost > 0 ? `Cost: ${idr.format(day.cost)}` : "",
            ].filter(Boolean) as unknown as string;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "oklch(0.76 0.045 245)", font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "oklch(0.39 0.065 246 / 0.4)" },
        ticks: {
          color: "oklch(0.76 0.045 245)",
          font: { size: 10 },
          callback: (v: string | number) => number.format(Number(v)),
        },
      },
    },
  }), [days, number, idr]);

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 text-primary" /> Usage
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Usage dashboard</h1>
              <p className="text-sm text-muted-foreground">Track requests, tokens, and IDR cost.</p>
            </div>
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  variant={range === opt.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRange(opt.key)}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  {opt.label}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => loadUsage(range)} disabled={loading} className="cursor-pointer">
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </header>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-3 h-9 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ChartSkeleton />
              <TableSkeleton rows={4} cols={5} />
            </div>
          ) : usage ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-4 w-4 text-blue-500" /> Requests ({RANGE_LABEL[range]})
                    </div>
                    <div className="mt-3 text-3xl font-semibold">{number.format(usage.totalRequests)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="h-4 w-4 text-emerald-500" /> Tokens ({RANGE_LABEL[range]})
                    </div>
                    <div className="mt-3 text-3xl font-semibold">{number.format(usage.totalTokens)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Coins className="h-4 w-4 text-amber-500" /> Cost ({RANGE_LABEL[range]})
                    </div>
                    <div className="mt-3 text-3xl font-semibold">{idr.format(usage.totalCost)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Daily usage</h2>
                    <span className="text-xs text-muted-foreground">{RANGE_LABEL[range]} · {days.filter((d) => d.tokens > 0).length} hari aktif</span>
                  </div>
                  {days.every((d) => d.tokens === 0) ? (
                    <EmptyState icon={BarChart3} title="No usage in this period." />
                  ) : (
                    <div className="h-72">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-4 text-sm font-semibold">Per-model usage</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="py-2 font-medium">Model</th>
                          <th className="py-2 text-right font-medium">Tokens</th>
                          <th className="py-2 text-right font-medium">Cost</th>
                          <th className="py-2 text-right font-medium">Requests</th>
                          <th className="py-2 text-right font-medium">% Tokens</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {usage.byModel.length === 0 ? (
                          <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No model usage in this period.</td></tr>
                        ) : usage.byModel.map((model) => (
                          <tr key={model.model}>
                            <td className="py-3 font-medium">{model.model}</td>
                            <td className="py-3 text-right tabular-nums">{number.format(model.tokens)}</td>
                            <td className="py-3 text-right tabular-nums">{idr.format(model.cost)}</td>
                            <td className="py-3 text-right tabular-nums">{number.format(model.requests)}</td>
                            <td className="py-3 text-right tabular-nums">{usage.totalTokens ? ((model.tokens / usage.totalTokens) * 100).toFixed(1) : "0.0"}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
