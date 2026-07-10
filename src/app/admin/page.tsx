"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Key,
  CreditCard,
  TrendingUp,
  Activity,
  Server,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [editingPlan, setEditingPlan] = useState<import("@/lib/server-store").MembershipPlan | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);

  const internalKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || "demo-key-xperimne";

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${internalKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      setError("Failed to load stats");
    }
    setLoading(false);
  }, [internalKey]);

  // eslint-disable-next-line -- fetch-on-mount setState in effect is standard React pattern
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const formatRupiah = (n: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "plans", label: "Membership", icon: CreditCard },
    { id: "providers", label: "Providers", icon: Server },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="flex items-center gap-3 text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Admin</span>
          </div>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-zinc-800 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-800 text-zinc-200 border border-b-0 border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 text-xs text-red-400">{error}</div>
        )}

        {!stats && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <LayoutDashboard className="w-12 h-12 mb-4 text-zinc-700" />
            <h3 className="text-sm font-medium text-zinc-400 mb-1">No Data</h3>
            <p className="text-xs text-zinc-500">Configure INTERNAL_API_KEY to access admin</p>
          </div>
        )}

        {stats && activeTab === "overview" && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="🔑" label="Active Keys" value={String(stats.overview.activeKeys)} sub={`${stats.overview.totalKeys} total`} />
              <StatCard icon="📡" label="Total Requests" value={formatNumber(stats.overview.totalRequests)} sub={`${formatNumber(stats.overview.todayRequests)} today`} />
              <StatCard icon="🎯" label="Total Tokens" value={formatNumber(stats.overview.totalTokens)} sub={`${formatNumber(stats.overview.todayTokens)} today`} />
              <StatCard icon="💰" label="Revenue" value={formatRupiah(stats.revenue.totalRevenue)} sub={`${stats.revenue.completedPayments} payments`} />
            </div>

            {/* Revenue & Subscriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Revenue</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Total Revenue</span><span className="text-zinc-200 font-semibold">{formatRupiah(stats.revenue.totalRevenue)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Pending</span><span className="text-amber-400">{formatRupiah(stats.revenue.pendingRevenue)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Completed</span><span className="text-emerald-400">{stats.revenue.completedPayments}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Pending Payments</span><span className="text-amber-400">{stats.revenue.pendingPayments}</span></div>
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Subscriptions</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-zinc-500">Total</span><span className="text-zinc-200">{stats.subscriptions.total}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Active</span><span className="text-emerald-400">{stats.subscriptions.active}</span></div>
                  {Object.entries(stats.subscriptions.byPlan).map(([planId, count]) => (
                    <div key={planId} className="flex justify-between">
                      <span className="text-zinc-500 capitalize">{planId}</span>
                      <span className="text-zinc-300">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Usage Chart */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">Daily Usage (30 days)</h3>
              <div className="flex items-end gap-1 h-24">
                {Object.entries(stats.dailyUsage).map(([date, count]) => {
                  const maxVal = Math.max(...Object.values(stats.dailyUsage), 1);
                  const height = (count / maxVal) * 100;
                  const isToday = date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div
                        className={`w-full rounded-t ${isToday ? "bg-emerald-500" : "bg-zinc-700/50 hover:bg-zinc-600/50"} transition-all`}
                        style={{ height: `${Math.max(height, count > 0 ? 4 : 1)}%` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                        {date}: {formatNumber(count)} tokens
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {stats && activeTab === "plans" && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">Membership Plans</h3>
              <button onClick={() => { setShowCreatePlan(true); setEditingPlan({ name: "", description: "", price: 0, billingPeriod: "monthly", features: { maxRequestsPerDay: 1000, maxTokensPerMonth: 1000000, allowedModels: [], allowedProviders: [], streaming: true, imageGeneration: false, apiAccess: true, priority: "normal" }, isActive: true, sortOrder: stats.plans.length }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Plan
              </button>
            </div>

            <div className="space-y-3">
              {stats.plans.map((plan) => (
                <div key={plan.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-200">{plan.name}</h3>
                        {plan.price === 0 ? (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">Free</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">{formatRupiah(plan.price)}/{plan.billingPeriod}</span>
                        )}
                        {!plan.isActive && <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">Inactive</span>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{plan.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingPlan(plan)} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-200"><Edit3 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                    <div className="bg-zinc-800/30 rounded-lg p-2"><span className="text-zinc-500 block">Requests/Day</span><span className="text-zinc-300 font-semibold">{plan.features.maxRequestsPerDay.toLocaleString()}</span></div>
                    <div className="bg-zinc-800/30 rounded-lg p-2"><span className="text-zinc-500 block">Tokens/Month</span><span className="text-zinc-300 font-semibold">{formatNumber(plan.features.maxTokensPerMonth)}</span></div>
                    <div className="bg-zinc-800/30 rounded-lg p-2"><span className="text-zinc-500 block">Models</span><span className="text-zinc-300 font-semibold">{plan.features.allowedModels.length === 0 ? "All" : plan.features.allowedModels.length}</span></div>
                    <div className="bg-zinc-800/30 rounded-lg p-2"><span className="text-zinc-500 block">Priority</span><span className="text-zinc-300 font-semibold capitalize">{plan.features.priority}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit/Create Plan Modal */}
            {(editingPlan || showCreatePlan) && (
              <PlanEditor
                plan={editingPlan}
                onSave={async (data) => {
                  const isNew = showCreatePlan || !editingPlan?.id;
                  const url = "/api/admin/plans";
                  const method = isNew ? "POST" : "PUT";
                  await fetch(url, {
                    method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${internalKey}` },
                    body: JSON.stringify(isNew ? data : { id: editingPlan.id, ...data }),
                  });
                  setEditingPlan(null); setShowCreatePlan(false); fetchStats();
                }}
                onClose={() => { setEditingPlan(null); setShowCreatePlan(false); }}
                internalKey={internalKey}
              />
            )}
          </>
        )}

        {stats && activeTab === "providers" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Provider Usage</h3>
            {Object.entries(stats.providers).length === 0 ? (
              <div className="text-xs text-zinc-500 py-8 text-center">No provider data yet</div>
            ) : (
              Object.entries(stats.providers)
                .sort(([, a], [, b]) => b - a)
                .map(([provider, tokens]) => {
                  const maxVal = Math.max(...Object.values(stats.providers), 1);
                  const width = (tokens / maxVal) * 100;
                  const colors: Record<string, string> = {
                    puter: "from-emerald-500 to-emerald-400",
                    openai: "from-blue-500 to-blue-400",
                    deepseek: "from-cyan-500 to-cyan-400",
                    anthropic: "from-amber-500 to-amber-400",
                  };
                  return (
                    <div key={provider} className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-zinc-300 capitalize">{provider}</span>
                        <span className="text-zinc-500">{formatNumber(tokens)} tokens</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${colors[provider] || "from-zinc-500 to-zinc-400"} transition-all`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Configuration</h3>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
              <ConfigItem label="INTERNAL_API_KEY" value={internalKey} secret />
              <ConfigItem label="PUTER_AUTH_TOKEN" value={process.env.NEXT_PUBLIC_INTERNAL_KEY ? "Configured" : "Not set"} />
              <ConfigItem label="OPENAI_API_KEY" value={process.env.OPENAI_API_KEY ? "Configured" : "Not set (optional fallback)"} />
              <ConfigItem label="DEEPSEEK_API_KEY" value={process.env.DEEPSEEK_API_KEY ? "Configured" : "Not set (optional fallback)"} />
              <ConfigItem label="ANTHROPIC_API_KEY" value={process.env.ANTHROPIC_API_KEY ? "Configured" : "Not set (optional fallback)"} />
              <ConfigItem label="MIDTRANS_SERVER_KEY" value={process.env.MIDTRANS_SERVER_KEY ? "Configured" : "Not set (dev mode - free)"} />
            </div>
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-xs text-amber-400/80">
                <strong>Note:</strong> Midtrans belum dikonfigurasi. Untuk development, subscription langsung aktif tanpa payment.
                Set MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY di .env.local untuk mengaktifkan payment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-lg md:text-xl font-bold text-zinc-100">{value}</div>
      <div className="text-[10px] text-zinc-500">{sub}</div>
      <div className="text-[10px] text-zinc-600 mt-0.5">{label}</div>
    </div>
  );
}

function ConfigItem({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-400 font-mono">{label}</span>
      <span className={`text-xs ${value.includes("Configured") ? "text-emerald-400" : "text-zinc-500"} font-mono`}>
        {secret ? "••••••••" : value}
      </span>
    </div>
  );
}

function PlanEditor({ plan, onSave, onClose, internalKey }: { plan: import("@/lib/server-store").MembershipPlan | null; onSave: (data: Record<string, unknown>) => void; onClose: () => void; internalKey: string }) {
  const [form, setForm] = useState(plan || {});
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string | number | boolean | undefined) => setForm((prev: Record<string, unknown>) => ({ ...prev, [key]: value }));
  const updateFeatures = (key: string, value: string | number | boolean | undefined) => setForm((prev: Record<string, unknown>) => ({ ...prev, features: { ...(prev.features as Record<string, unknown>), [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">{form.id ? "Edit Plan" : "Create Plan"}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Plan Name</label>
            <input value={form.name || ""} onChange={(e) => update("name", e.target.value)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Description</label>
            <input value={form.description || ""} onChange={(e) => update("description", e.target.value)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Price (IDR)</label>
              <input type="number" value={form.price || 0} onChange={(e) => update("price", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Billing Period</label>
              <select value={form.billingPeriod || "monthly"} onChange={(e) => update("billingPeriod", e.target.value)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Max Requests/Day</label>
              <input type="number" value={form.features?.maxRequestsPerDay || 0} onChange={(e) => updateFeatures("maxRequestsPerDay", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Max Tokens/Month</label>
              <input type="number" value={form.features?.maxTokensPerMonth || 0} onChange={(e) => updateFeatures("maxTokensPerMonth", parseInt(e.target.value) || 0)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Streaming</label>
              <select value={form.features?.streaming ? "yes" : "no"} onChange={(e) => updateFeatures("streaming", e.target.value === "yes")} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Image Generation</label>
              <select value={form.features?.imageGeneration ? "yes" : "no"} onChange={(e) => updateFeatures("imageGeneration", e.target.value === "yes")} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Priority</label>
            <select value={form.features?.priority || "normal"} onChange={(e) => updateFeatures("priority", e.target.value)} className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-zinc-600">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive !== false} onChange={(e) => update("isActive", e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
            <span className="text-xs text-zinc-400">Active</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50">
            {saving ? "Saving..." : form.id ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
