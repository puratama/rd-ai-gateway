"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Coins, Hash, RefreshCw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  byModel: ModelUsage[];
  byDay: DailyUsage[];
}

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("id-ID");

function shortDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/user/usage");
      if (!response.ok) throw new Error("Failed to load usage.");
      setUsage((await response.json()) as UsageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const days = useMemo(() => usage?.byDay.slice(-30) ?? [], [usage]);
  const maxTokens = Math.max(...days.map((day) => day.tokens), 1);

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
            <Button variant="outline" size="sm" onClick={loadUsage} disabled={loading} className="cursor-pointer">
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </header>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {loading && !usage ? (
            <div className="flex h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" /> Loading usage...
            </div>
          ) : usage ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="h-4 w-4 text-blue-500" /> Total Requests</div><div className="mt-3 text-3xl font-semibold">{number.format(usage.totalRequests)}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 className="h-4 w-4 text-emerald-500" /> Total Tokens</div><div className="mt-3 text-3xl font-semibold">{number.format(usage.totalTokens)}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Coins className="h-4 w-4 text-amber-500" /> Total Cost</div><div className="mt-3 text-3xl font-semibold">{idr.format(usage.totalCost)}</div></CardContent></Card>
              </div>

              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Daily usage</h2>
                    <span className="text-xs text-muted-foreground">Last 30 days · tokens</span>
                  </div>
                  {days.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No daily usage yet.</div>
                  ) : (
                    <div className="flex h-56 items-end gap-1.5">
                      {days.map((day) => (
                        <div key={day.date} className="group relative flex flex-1 flex-col items-center gap-2">
                          <div className="flex w-full flex-1 items-end rounded-t bg-muted/60">
                            <div className="w-full rounded-t bg-primary transition-opacity hover:opacity-80" style={{ height: `${Math.max((day.tokens / maxTokens) * 100, day.tokens > 0 ? 4 : 1)}%` }} />
                          </div>
                          <span className="max-w-10 -rotate-45 truncate text-[10px] text-muted-foreground">{shortDate(day.date)}</span>
                          <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground opacity-0 shadow group-hover:opacity-100">
                            {number.format(day.tokens)} tokens · {number.format(day.requests)} requests
                          </div>
                        </div>
                      ))}
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
                          <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No model usage yet.</td></tr>
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
