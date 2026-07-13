"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  CreditCard,
  TrendingUp,
  Server,
  Settings,
  Plus,
  Edit3,
  RefreshCw,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import AppShell from "@/components/layout/AppShell";

interface AdminStats {
  overview: { totalKeys: number; activeKeys: number; usedKeys: number; totalRequests: number; totalTokens: number; todayTokens: number; todayRequests: number };
  revenue: { totalRevenue: number; pendingRevenue: number; completedPayments: number; pendingPayments: number };
  subscriptions: { total: number; active: number; byPlan: Record<string, number> };
  providers: Record<string, number>;
  dailyUsage: Record<string, number>;
  plans: import("@/lib/server-store").MembershipPlan[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("tab") || "overview";
  const [editingPlan, setEditingPlan] = useState<import("@/lib/server-store").MembershipPlan | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);

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

  // eslint-disable-next-line -- fetch-on-mount setState in effect is standard React pattern
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <AppShell variant="admin">
        <div className="h-full flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading admin dashboard...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="h-full flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold capitalize">{activeSection}</h2>
            </div>
            {activeSection === "plans" && (
              <Button size="sm" onClick={() => { setShowCreatePlan(true); setCreatingPlan(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Plan
              </Button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {!stats && !error && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <LayoutDashboard className="w-12 h-12 mb-4 opacity-30" />
                <h3 className="text-sm font-medium mb-1">No Data</h3>
                <p className="text-xs">Configure INTERNAL_API_KEY to access admin</p>
              </div>
            )}

            {stats && (
              <>
                {activeSection === "overview" && (
                  <div className="space-y-6 animate-in fade-in duration-200">
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
                          <div className="text-2xl font-bold">{formatRupiah(stats.revenue.totalRevenue)}</div>
                          <p className="text-xs text-muted-foreground">{stats.revenue.completedPayments} payments</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Revenue</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold">{formatRupiah(stats.revenue.totalRevenue)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="text-amber-500">{formatRupiah(stats.revenue.pendingRevenue)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="text-emerald-500">{stats.revenue.completedPayments}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Pending Payments</span><span className="text-amber-500">{stats.revenue.pendingPayments}</span></div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Subscriptions</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{stats.subscriptions.total}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="text-emerald-500">{stats.subscriptions.active}</span></div>
                          {Object.entries(stats.subscriptions.byPlan).map(([planId, count]) => (
                            <div key={planId} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{planId}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader><CardTitle className="text-sm">Daily Usage (30 days)</CardTitle></CardHeader>
                      <CardContent>
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
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeSection === "plans" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-3">
                      {stats.plans.map((plan) => (
                        <Card key={plan.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                                  {plan.price === 0 ? (
                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">Free</span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">{formatRupiah(plan.price)}/{plan.billingPeriod}</span>
                                  )}
                                  {!plan.isActive && <span className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">Inactive</span>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => setEditingPlan(plan)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                              <div className="bg-muted/30 rounded-lg p-2"><span className="text-muted-foreground block">Requests/Day</span><span className="font-semibold">{plan.features.maxRequestsPerDay.toLocaleString()}</span></div>
                              <div className="bg-muted/30 rounded-lg p-2"><span className="text-muted-foreground block">Tokens/Month</span><span className="font-semibold">{formatNumber(plan.features.maxTokensPerMonth)}</span></div>
                              <div className="bg-muted/30 rounded-lg p-2"><span className="text-muted-foreground block">Models</span><span className="font-semibold">{plan.features.allowedModels.length === 0 ? "All" : plan.features.allowedModels.length}</span></div>
                              <div className="bg-muted/30 rounded-lg p-2"><span className="text-muted-foreground block">Priority</span><span className="font-semibold capitalize">{plan.features.priority}</span></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Dialog open={editingPlan !== null || showCreatePlan} onOpenChange={(open) => {
                      if (!open) { setEditingPlan(null); setShowCreatePlan(false); setCreatingPlan(false); }
                    }}>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>{creatingPlan ? "Create Plan" : "Edit Plan"}</DialogTitle>
                        </DialogHeader>
                        <PlanEditor
                          plan={creatingPlan ? null : editingPlan}
                          onSave={async (data) => {
                            const isNew = creatingPlan || !editingPlan?.id;
                            const url = "/api/admin/plans";
                            const method = isNew ? "POST" : "PUT";
                            await fetch(url, {
                              method,
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(isNew ? data : { id: editingPlan!.id, ...data }),
                            });
                            setEditingPlan(null); setShowCreatePlan(false); setCreatingPlan(false); fetchStats();
                          }}
                          onClose={() => { setEditingPlan(null); setShowCreatePlan(false); setCreatingPlan(false); }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {activeSection === "providers" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {Object.entries(stats.providers).length === 0 ? (
                      <div className="text-sm text-muted-foreground py-8 text-center">No provider data yet</div>
                    ) : (
                      Object.entries(stats.providers)
                        .sort(([, a], [, b]) => b - a)
                        .map(([provider, tokens]) => {
                          const maxVal = Math.max(...Object.values(stats.providers), 1);
                          const width = (tokens / maxVal) * 100;
                          const colors: Record<string, string> = {
                            puter: "bg-emerald-500",
                            openai: "bg-blue-500",
                            deepseek: "bg-cyan-500",
                            anthropic: "bg-amber-500",
                          };
                          return (
                            <Card key={provider}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2 text-sm">
                                  <span className="capitalize font-medium">{provider}</span>
                                  <span className="text-muted-foreground">{formatNumber(tokens)} tokens</span>
                                </div>
                                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div className={cn("h-full rounded-full transition-all", colors[provider] || "bg-zinc-500")} style={{ width: `${width}%` }} />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                    )}
                  </div>
                )}

                {activeSection === "settings" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <ConfigItem label="INTERNAL_API_KEY" value="Configured" secret />
                        <ConfigItem label="PUTER_AUTH_TOKEN" value={process.env.NEXT_PUBLIC_INTERNAL_KEY ? "Configured" : "Not set"} />
                        <ConfigItem label="OPENAI_API_KEY" value={process.env.OPENAI_API_KEY ? "Configured" : "Not set (optional fallback)"} />
                        <ConfigItem label="DEEPSEEK_API_KEY" value={process.env.DEEPSEEK_API_KEY ? "Configured" : "Not set (optional fallback)"} />
                        <ConfigItem label="ANTHROPIC_API_KEY" value={process.env.ANTHROPIC_API_KEY ? "Configured" : "Not set (optional fallback)"} />
                        <ConfigItem label="MIDTRANS_SERVER_KEY" value={process.env.MIDTRANS_SERVER_KEY ? "Configured" : "Not set (dev mode - free)"} />
                      </CardContent>
                    </Card>
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <p className="text-sm text-amber-500/80">
                        <strong>Note:</strong> Midtrans belum dikonfigurasi. Untuk development, subscription langsung aktif tanpa payment.
                        Set MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di .env.local untuk mengaktifkan payment.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ConfigItem({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
      <span className={cn("text-xs font-mono", value.includes("Configured") ? "text-emerald-500" : "text-muted-foreground")}>
        {secret ? "••••••••" : value}
      </span>
    </div>
  );
}

interface PlanForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: string;
  features: {
    maxRequestsPerDay: number;
    maxTokensPerMonth: number;
    allowedModels: string[];
    allowedProviders: string[];
    streaming: boolean;
    imageGeneration: boolean;
    apiAccess: boolean;
    priority: string;
  };
  isActive: boolean;
  sortOrder: number;
}

function PlanEditor({ plan, onSave, onClose }: { plan: import("@/lib/server-store").MembershipPlan | null; onSave: (data: PlanForm) => void; onClose: () => void }) {
  const [form, setForm] = useState<PlanForm>(
    plan
      ? { id: plan.id, name: plan.name, description: plan.description || "", price: plan.price, billingPeriod: plan.billingPeriod, features: { ...plan.features }, isActive: plan.isActive, sortOrder: plan.sortOrder }
      : { name: "", description: "", price: 0, billingPeriod: "monthly", features: { maxRequestsPerDay: 1000, maxTokensPerMonth: 1000000, allowedModels: [], allowedProviders: [], streaming: true, imageGeneration: false, apiAccess: true, priority: "normal" }, isActive: true, sortOrder: 0 }
  );
  const [saving, setSaving] = useState(false);

  const update = (key: keyof PlanForm, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const updateFeatures = (key: keyof PlanForm["features"], value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Plan Name</label>
          <Input value={form.name || ""} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Description</label>
          <Input value={form.description || ""} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Price (IDR)</label>
            <Input type="number" value={form.price || 0} onChange={(e) => update("price", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Billing Period</label>
            <select value={form.billingPeriod || "monthly"} onChange={(e) => update("billingPeriod", e.target.value)} className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Max Requests/Day</label>
            <Input type="number" value={form.features?.maxRequestsPerDay || 0} onChange={(e) => updateFeatures("maxRequestsPerDay", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Max Tokens/Month</label>
            <Input type="number" value={form.features?.maxTokensPerMonth || 0} onChange={(e) => updateFeatures("maxTokensPerMonth", parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Streaming</label>
            <select value={form.features?.streaming ? "yes" : "no"} onChange={(e) => updateFeatures("streaming", e.target.value === "yes")} className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Image Generation</label>
            <select value={form.features?.imageGeneration ? "yes" : "no"} onChange={(e) => updateFeatures("imageGeneration", e.target.value === "yes")} className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Priority</label>
          <select value={form.features?.priority || "normal"} onChange={(e) => updateFeatures("priority", e.target.value)} className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive !== false} onChange={(e) => update("isActive", e.target.checked)} className="rounded border-input accent-primary" />
          <span className="text-sm text-muted-foreground">Active</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : form.id ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}
