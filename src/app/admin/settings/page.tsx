"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  BarChart3,
  Image,
  Link2,
  FileText,
  Palette,
} from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSelect, type SelectOption } from "@/components/ui/form-select";
import { FormSection, FormPanel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { ImageUploadField } from "@/components/ui/image-upload-field";

type SettingsTabId = "site" | "payment" | "aggregator";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <AdminSettingsContent />
    </Suspense>
  );
}

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTabId | null;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabParam || "site");

  useEffect(() => {
    const current = searchParams.get("tab") as SettingsTabId | null;
    if (current && current !== activeTab) setActiveTab(current);
  }, []);

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi payment gateway dan aggregator.
          </p>
        </div>

        <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
          {(
            [
              { id: "site" as const, label: "Site", icon: Globe },
              { id: "payment" as const, label: "Payment Gateway", icon: Building2 },
              { id: "aggregator" as const, label: "Aggregator", icon: Layers },
            ]
          ).map((tab) => {
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

        {activeTab === "site" && <SiteSettingsSection />}
        {activeTab === "payment" && <PaymentGatewaySection />}
        {activeTab === "aggregator" && <AggregatorSection />}
      </div>
    </AppShell>
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
        <TableSkeleton rows={4} cols={7} />
      ) : gateways.length === 0 ? (
        <EmptyState icon={Building2} title="Belum ada payment gateway." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 font-medium">Provider</TableHead>
                <TableHead className="px-4 font-medium">Nama</TableHead>
                <TableHead className="px-4 font-medium">Environment</TableHead>
                <TableHead className="px-4 font-medium">Server Key</TableHead>
                <TableHead className="px-4 font-medium">Client Key</TableHead>
                <TableHead className="px-4 text-center font-medium">Status</TableHead>
                <TableHead className="px-4 font-medium">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="px-4 py-3">
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
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium">{g.name}</TableCell>
                  <TableCell className="px-4 py-3 capitalize text-muted-foreground">
                    {g.environment}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        g.hasServerKey
                          ? "text-emerald-400 text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {g.hasServerKey ? "••••••••" : "None"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        g.hasClientKey
                          ? "text-emerald-400 text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {g.hasClientKey ? "••••••••" : "None"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
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
                  </TableCell>
                  <TableCell className="px-4 py-3">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {editing ? "Edit Gateway" : "Add Gateway"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {editing
                  ? "Update konfigurasi payment gateway."
                  : "Tambah payment gateway baru."}
              </DialogDescription>
            </div>
          </div>
          <GatewayForm
            gateway={editing}
            onSave={async (data) => {
              const res = editing
                ? await fetch("/api/admin/settings/payment", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editing.id, ...data }),
                  })
                : await fetch("/api/admin/settings/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Save failed" }));
                throw new Error(err.error || "Save failed");
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
  const [formError, setFormError] = useState("");

  const keyLabels = PROVIDER_KEY_LABELS[form.provider] || PROVIDER_KEY_LABELS.midtrans;

  const providerOptions: SelectOption[] = [
    { value: "midtrans", label: "Midtrans" },
    { value: "xendit", label: "Xendit" },
  ];
  const envOptions: SelectOption[] = [
    { value: "sandbox", label: "Sandbox" },
    { value: "production", label: "Production" },
  ];
  const findOpt = (opts: SelectOption[], v: string) =>
    opts.find((o) => o.value === v) ?? null;

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    const data: Record<string, unknown> = {
      provider: form.provider,
      name: form.name,
      environment: form.environment,
      isActive: form.isActive,
    };
    if (form.serverKey) data.serverKey = form.serverKey;
    if (form.clientKey) data.clientKey = form.clientKey;
    try {
      await onSave(data);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {formError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        {/* ── General ── */}
        <section>
          <FormSection>General</FormSection>
          <FormPanel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <FormSelect
                  options={providerOptions}
                  value={findOpt(providerOptions, form.provider)}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      provider: v || "midtrans",
                      name: gateway ? p.name : (v ? PROVIDER_LABELS[v] || v : ""),
                    }))
                  }
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              <div>
                <Label>Nama</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder={`e.g. ${PROVIDER_LABELS[form.provider]}`}
                  className="h-9 bg-background"
                />
              </div>
            </div>
          </FormPanel>
        </section>

        {/* ── Credentials ── */}
        <section>
          <FormSection>Credentials</FormSection>
          <FormPanel className="space-y-3">
            <div>
              <Label>{keyLabels.server}</Label>
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
                className="h-9 bg-background"
              />
            </div>
            <div>
              <Label>{keyLabels.client}</Label>
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
                className="h-9 bg-background"
              />
            </div>
          </FormPanel>
        </section>

        {/* ── Environment & Status ── */}
        <section>
          <FormSection>Environment &amp; Status</FormSection>
          <FormPanel className="space-y-4">
            <div>
              <Label>Environment</Label>
              <FormSelect
                options={envOptions}
                value={findOpt(envOptions, form.environment)}
                onChange={(v) =>
                  setForm((p) => ({ ...p, environment: v || "sandbox" }))
                }
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Gateway Active</p>
                <p className="text-xs text-muted-foreground/60">
                  Saat nonaktif, gateway tidak dipakai untuk transaksi.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
          </FormPanel>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/10">
        <Button variant="outline" size="sm" onClick={onClose}>
          Batal
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? "Menyimpan..." : gateway ? "Update" : "Tambah"}
        </Button>
      </div>
    </div>
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
  const [usageAggregator, setUsageAggregator] = useState<AggregatorItem | null>(null);
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
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

  interface UsageDetail {
    provider: string;
    model: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }

  interface UsageStats {
    aggregatorId: string;
    aggregatorName: string;
    totalTokens: number;
    totalRequests: number;
    modelCount: number;
    details: UsageDetail[];
  }

  const handleShowUsage = async (agg: AggregatorItem) => {
    setUsageAggregator(agg);
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/admin/aggregators/usage?id=${agg.id}`);
      if (res.ok) setUsageData(await res.json());
    } catch {
      setUsageData(null);
    }
    setUsageLoading(false);
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
        <TableSkeleton rows={4} cols={5} />
      ) : aggregators.length === 0 ? (
        <EmptyState icon={Layers} title="Belum ada aggregator." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 font-medium">Nama</TableHead>
                <TableHead className="px-4 font-medium">Base URL</TableHead>
                <TableHead className="px-4 font-medium">API Key</TableHead>
                <TableHead className="px-4 text-center font-medium">Status</TableHead>
                <TableHead className="px-4 font-medium">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregators.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="px-4 py-3 font-medium">{a.name}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {a.baseUrl}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        a.hasApiKey
                          ? "text-emerald-400 text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {a.hasApiKey ? "••••••••" : "None"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
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
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex gap-1 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleShowUsage(a)}
                        title="Lihat Penggunaan"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                      </Button>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {editing ? "Edit Aggregator" : "Add Aggregator"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {editing
                  ? "Update pengaturan aggregator."
                  : "Tambah koneksi aggregator baru."}
              </DialogDescription>
            </div>
          </div>
          <AggregatorForm
            aggregator={editing}
            onSave={async (data) => {
              const res = editing
                ? await fetch("/api/admin/aggregators", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editing.id, ...data }),
                  })
                : await fetch("/api/admin/aggregators", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
              if (!res.ok) throw new Error("Save failed");
              setShowCreate(false);
              setEditing(null);
              fetchAggregators();
              toast.success(editing ? "Aggregator updated" : "Aggregator created");
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

      {/* Usage Modal */}
      <Dialog open={!!usageAggregator} onOpenChange={(o) => { if (!o) { setUsageAggregator(null); setUsageData(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Usage: {usageAggregator?.name}</DialogTitle>
            <DialogDescription>Penggunaan API melalui aggregator ini.</DialogDescription>
          </DialogHeader>
          {usageLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
          ) : usageData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{usageData.totalTokens.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Tokens</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{usageData.totalRequests.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Requests</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{usageData.modelCount}</p>
                    <p className="text-xs text-muted-foreground">Models Used</p>
                  </CardContent>
                </Card>
              </div>
              {usageData.details.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50 text-muted-foreground">
                      <TableRow>
                        <TableHead className="px-4 font-medium">Model</TableHead>
                        <TableHead className="px-4 font-medium">Provider</TableHead>
                        <TableHead className="px-4 text-right font-medium">Requests</TableHead>
                        <TableHead className="px-4 text-right font-medium">Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageData.details.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-4 py-3 font-medium">{d.model}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground">{d.provider}</TableCell>
                          <TableCell className="px-4 py-3 text-right">{d.requests.toLocaleString()}</TableCell>
                          <TableCell className="px-4 py-3 text-right">{d.totalTokens.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada data penggunaan model.</p>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada data penggunaan.</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Tutup</Button>} />
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
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* ── General ── */}
        <section>
          <FormSection>General</FormSection>
          <FormPanel className="space-y-3">
            <div>
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., My Aggregator"
                className="h-9 bg-background"
              />
            </div>
            <div>
              <Label>Base URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, baseUrl: e.target.value }))
                }
                placeholder="https://api.aggregator.com/v1"
                className="h-9 bg-background"
              />
            </div>
          </FormPanel>
        </section>

        {/* ── Credentials ── */}
        <section>
          <FormSection>Credentials</FormSection>
          <FormPanel>
            <div>
              <Label>API Key</Label>
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
                className="h-9 bg-background"
              />
            </div>
          </FormPanel>
        </section>

        {/* ── Status ── */}
        <section>
          <FormSection>Status</FormSection>
          <FormPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Aggregator Active</p>
                <p className="text-xs text-muted-foreground/60">
                  Saat nonaktif, koneksi ini tidak dipakai.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
          </FormPanel>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/10">
        <Button variant="outline" size="sm" onClick={onClose}>
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !form.name || !form.baseUrl}
        >
          {saving
            ? "Menyimpan..."
            : aggregator
            ? "Update"
            : "Tambah"}
        </Button>
      </div>
    </div>
  );
}

// ─── Site Settings ─────────────────────────────────────────────────────────

function SiteField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

const LOGO_MODE_OPTIONS: SelectOption[] = [
  { value: "logo", label: "Hanya Logo" },
  { value: "logo-name", label: "Logo + Nama" },
  { value: "name", label: "Hanya Nama" },
];

function SiteSettingsSection() {
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/site");
      if (res.ok) setForm(await res.json());
    } catch {
      setError("Failed to load site settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const set = (field: keyof SiteSettings, value: string) =>
    setForm((prev) =>
      prev ? ({ ...prev, [field]: value } as SiteSettings) : prev
    );

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setForm(await res.json());
      toast.success("Site settings updated");
    } catch {
      setError("Failed to save site settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 animate-pulse lg:grid-cols-2">
        <div className="h-80 rounded-xl border border-border bg-card lg:col-span-2" />
        <div className="h-56 rounded-xl border border-border bg-card" />
        <div className="h-56 rounded-xl border border-border bg-card" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        {error || "Gagal memuat pengaturan situs."}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Site Settings</h2>
          <p className="text-xs text-muted-foreground">
            Nama situs, branding, dan metadata diterapkan di seluruh situs.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-primary" /> Branding
            </CardTitle>
            <CardDescription>
              Identitas visual situs: nama, logo, favicon, dan deskripsi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {form.logoUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3">
                <SiteField label="Nama Situs">
                  <Input
                    value={form.siteName}
                    onChange={(e) => set("siteName", e.target.value)}
                    placeholder="Nama situs"
                    className="h-9 bg-background"
                  />
                </SiteField>
              </div>
            </div>

            <SiteField label="Tagline">
              <Input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                className="h-9 bg-background"
              />
            </SiteField>

            <SiteField label="Deskripsi Situs">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="bg-background"
              />
            </SiteField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ImageUploadField
                label="Logo URL"
                hint="URL gambar. Dipakai di navbar & footer."
                value={form.logoUrl}
                uploadType="logo"
                placeholder="https://.../logo.png"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                onChange={(v) => set("logoUrl", v)}
              />
              <ImageUploadField
                label="Favicon URL"
                hint="Tampil di tab browser (ikon situs)."
                value={form.faviconUrl}
                uploadType="favicon"
                placeholder="https://.../favicon.ico"
                accept=".png,.ico,.svg,.webp"
                onChange={(v) => set("faviconUrl", v)}
              />
            </div>

            <SiteField
              label="Mode Logo"
              hint="logo: hanya logo (lebar otomatis, h-8). logo-name: logo + nama. name: hanya nama."
            >
              <FormSelect
                options={LOGO_MODE_OPTIONS}
                value={LOGO_MODE_OPTIONS.find((o) => o.value === form.logoMode) ?? LOGO_MODE_OPTIONS[0]}
                onChange={(v) => set("logoMode", v ?? "logo-name")}
                isClearable={false}
                isSearchable={false}
              />
            </SiteField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" /> Meta & SEO
            </CardTitle>
            <CardDescription>
              Metadata untuk mesin pencari dan social share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SiteField label="Meta Title">
              <Input
                value={form.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
                className="h-9 bg-background"
              />
            </SiteField>
            <SiteField label="Meta Description">
              <Textarea
                value={form.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                className="bg-background"
              />
            </SiteField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 text-primary" /> Links
            </CardTitle>
            <CardDescription>
              Tautan eksternal yang dipakai di seluruh situs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <SiteField label="Base URL" hint="Endpoint API gateway (mis. https://api.site.com/v1).">
              <Input
                value={form.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://api.example.com/v1"
                className="h-9 bg-background"
              />
            </SiteField>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


