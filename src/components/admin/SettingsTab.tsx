"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Save,
  Building2,
  Layers,
  Globe,
  AlertTriangle,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SettingsTabId = "payment" | "aggregator";

const TABS: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
  { id: "payment", label: "Payment Gateway", icon: Building2 },
  { id: "aggregator", label: "Aggregator", icon: Layers },
];

export default function SettingsTab() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("payment");

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "payment" && <PaymentGatewaySection />}
      {activeTab === "aggregator" && <AggregatorSection />}
    </div>
  );
}

// ─── Payment Gateway ──────────────────────────────────────────────────────

interface GatewayItem {
  id: string;
  provider: string;
  name: string;
  hasServerKey: boolean;
  hasClientKey: boolean;
  environment: string;
  isActive: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  midtrans: "Midtrans",
  xendit: "Xendit",
};

const PROVIDER_KEY_LABELS: Record<string, { server: string; client: string }> = {
  midtrans: { server: "Server Key", client: "Client Key" },
  xendit: { server: "Secret Key", client: "Callback Token" },
};

function PaymentGatewaySection() {
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<GatewayItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/payment");
      if (res.ok) {
        const data = await res.json();
        setGateways(data);
      }
    } catch {
      setError("Failed to load payment gateways");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/settings/payment?id=${deletingId}`, {
        method: "DELETE",
      });
      setDeletingId(null);
      fetchGateways();
    } catch {
      setError("Failed to delete gateway");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payment Gateways</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi payment gateway (Midtrans / Xendit).
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(true);
            setEditing(null);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Gateway
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : gateways.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada payment gateway.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Environment</th>
                  <th className="px-4 py-3 font-medium">Server Key</th>
                  <th className="px-4 py-3 font-medium">Client Key</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gateways.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          g.provider === "midtrans"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-violet-500/10 text-violet-400"
                        )}
                      >
                        {PROVIDER_LABELS[g.provider] || g.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{g.name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">
                      {g.environment}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          g.hasServerKey
                            ? "text-emerald-400 text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {g.hasServerKey ? "••••••••" : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          g.hasClientKey
                            ? "text-emerald-400 text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {g.hasClientKey ? "••••••••" : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          g.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            g.isActive ? "bg-emerald-400" : "bg-muted-foreground"
                          )}
                        />
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditing(g);
                            setShowCreate(true);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(g.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreate(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Gateway" : "Add Gateway"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update konfigurasi payment gateway."
                : "Tambah payment gateway baru."}
            </DialogDescription>
          </DialogHeader>
          <GatewayForm
            gateway={editing}
            onSave={async (data) => {
              if (editing) {
                await fetch("/api/admin/settings/payment", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: editing.id, ...data }),
                });
              } else {
                await fetch("/api/admin/settings/payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
              }
              setShowCreate(false);
              setEditing(null);
              fetchGateways();
            }}
            onClose={() => {
              setShowCreate(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId}
        onOpenChange={(o) => {
          if (!o) setDeletingId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <DialogTitle>Delete Gateway</DialogTitle>
            </div>
            <DialogDescription>
              Ini akan menghapus konfigurasi payment gateway secara permanen.
              Transaksi yang menggunakan gateway ini akan gagal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Batal</Button>} />
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GatewayForm({
  gateway,
  onSave,
  onClose,
}: {
  gateway: GatewayItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    provider: gateway?.provider || "midtrans",
    name: gateway?.name || "",
    serverKey: "",
    clientKey: "",
    environment: gateway?.environment || "sandbox",
    isActive: gateway?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const keyLabels = PROVIDER_KEY_LABELS[form.provider] || PROVIDER_KEY_LABELS.midtrans;

  const handleSave = async () => {
    setSaving(true);
    const data: Record<string, unknown> = {
      provider: form.provider,
      name: form.name,
      environment: form.environment,
      isActive: form.isActive,
    };
    if (form.serverKey) data.serverKey = form.serverKey;
    if (form.clientKey) data.clientKey = form.clientKey;
    await onSave(data);
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Provider
            </label>
            <Select
              value={form.provider}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  provider: v || "midtrans",
                  name: gateway ? p.name : (v ? PROVIDER_LABELS[v] || v : ""),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="midtrans">Midtrans</SelectItem>
                <SelectItem value="xendit">Xendit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Nama
            </label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder={`e.g. ${PROVIDER_LABELS[form.provider]}`}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {keyLabels.server}
          </label>
          <Input
            type="password"
            value={form.serverKey}
            onChange={(e) =>
              setForm((p) => ({ ...p, serverKey: e.target.value }))
            }
            placeholder={
              gateway
                ? "Kosongkan untuk tidak mengubah"
                : form.provider === "midtrans"
                ? "SB-Mid-server-..."
                : "xnd_..."
            }
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            {keyLabels.client}
          </label>
          <Input
            type="password"
            value={form.clientKey}
            onChange={(e) =>
              setForm((p) => ({ ...p, clientKey: e.target.value }))
            }
            placeholder={
              gateway
                ? "Kosongkan untuk tidak mengubah"
                : form.provider === "midtrans"
                ? "SB-Mid-client-..."
                : "Token verifikasi callback"
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Environment
            </label>
            <Select
              value={form.environment}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, environment: v || "sandbox" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Status
            </label>
            <Select
              value={form.isActive ? "active" : "inactive"}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, isActive: v === "active" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !form.name}
        >
          {saving
            ? "Menyimpan..."
            : gateway
            ? "Update"
            : "Tambah"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Aggregator ───────────────────────────────────────────────────────────

interface AggregatorItem {
  id: string;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  ok: boolean;
  status: number;
  latency: number;
  modelCount?: number | null;
  error?: string;
}

function AggregatorSection() {
  const [aggregators, setAggregators] = useState<AggregatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AggregatorItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, TestResult>
  >({});
  const [error, setError] = useState("");

  const fetchAggregators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aggregators");
      if (res.ok) setAggregators(await res.json());
    } catch {
      setError("Failed to load aggregators");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAggregators();
  }, [fetchAggregators]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/aggregators?id=${deletingId}`, {
        method: "DELETE",
      });
      setDeletingId(null);
      fetchAggregators();
    } catch {
      setError("Failed to delete aggregator");
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/admin/aggregators/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: TestResult = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: data }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, status: 0, latency: 0, error: "Request failed" },
      }));
    }
    setTestingId(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Aggregators</h2>
          <p className="text-xs text-muted-foreground">
            Kelola koneksi API aggregator.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(true);
            setEditing(null);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Aggregator
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : aggregators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada aggregator.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Base URL</th>
                  <th className="px-4 py-3 font-medium">API Key</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aggregators.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {a.baseUrl}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          a.hasApiKey
                            ? "text-emerald-400 text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {a.hasApiKey ? "••••••••" : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          a.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            a.isActive
                              ? "bg-emerald-400"
                              : "bg-muted-foreground"
                          )}
                        />
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {testResults[a.id] && (
                          <span
                            className={cn(
                              "text-[10px] mr-1",
                              testResults[a.id].ok
                                ? "text-emerald-400"
                                : "text-destructive"
                            )}
                          >
                            {testResults[a.id].ok
                              ? `${testResults[a.id].latency}ms`
                              : "Fail"}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleTestConnection(a.id)}
                          disabled={testingId === a.id}
                          title="Test Connection"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5",
                              testingId === a.id && "animate-spin"
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditing(a);
                            setShowCreate(true);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingId(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreate(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Aggregator" : "Add Aggregator"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update pengaturan aggregator."
                : "Tambah koneksi aggregator baru."}
            </DialogDescription>
          </DialogHeader>
          <AggregatorForm
            aggregator={editing}
            onSave={async (data) => {
              if (editing) {
                await fetch("/api/admin/aggregators", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: editing.id, ...data }),
                });
              } else {
                await fetch("/api/admin/aggregators", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
              }
              setShowCreate(false);
              setEditing(null);
              fetchAggregators();
            }}
            onClose={() => {
              setShowCreate(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingId}
        onOpenChange={(o) => {
          if (!o) setDeletingId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <DialogTitle>Delete Aggregator</DialogTitle>
            </div>
            <DialogDescription>
              Ini akan menghapus konfigurasi aggregator secara permanen.
              Model yang bergantung pada aggregator ini tidak akan bisa
              diakses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Batal</Button>} />
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AggregatorForm({
  aggregator,
  onSave,
  onClose,
}: {
  aggregator: AggregatorItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: aggregator?.name || "",
    baseUrl: aggregator?.baseUrl || "",
    apiKey: "",
    isActive: aggregator?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data: Record<string, unknown> = {
      name: form.name,
      baseUrl: form.baseUrl,
      isActive: form.isActive,
    };
    if (form.apiKey) data.apiKey = form.apiKey;
    await onSave(data);
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            Nama
          </label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g., My Aggregator"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            Base URL
          </label>
          <Input
            value={form.baseUrl}
            onChange={(e) =>
              setForm((p) => ({ ...p, baseUrl: e.target.value }))
            }
            placeholder="https://api.aggregator.com/v1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            API Key
          </label>
          <Input
            type="password"
            value={form.apiKey}
            onChange={(e) =>
              setForm((p) => ({ ...p, apiKey: e.target.value }))
            }
            placeholder={
              aggregator
                ? "Kosongkan untuk tidak mengubah"
                : "sk-..."
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm((p) => ({ ...p, isActive: e.target.checked }))
            }
            className="rounded border-input accent-primary"
          />
          <span className="text-sm text-muted-foreground">Aktif</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !form.name || !form.baseUrl}
        >
          {saving
            ? "Menyimpan..."
            : aggregator
            ? "Update"
            : "Tambah"}
        </Button>
      </DialogFooter>
    </>
  );
}


