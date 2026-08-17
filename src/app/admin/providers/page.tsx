"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Server,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSection, FormPanel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/skeleton";
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

interface ProviderItem {
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

function AdminProvidersPageContent() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ProviderItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [usageProvider, setUsageProvider] = useState<ProviderItem | null>(null);
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aggregators");
      if (res.ok) setProviders(await res.json());
    } catch {
      setError("Failed to load providers");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/aggregators?id=${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      fetchProviders();
    } catch {
      setError("Failed to delete provider");
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

  const handleShowUsage = async (provider: ProviderItem) => {
    setUsageProvider(provider);
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/admin/aggregators/usage?id=${provider.id}`);
      if (res.ok) setUsageData(await res.json());
    } catch {
      setUsageData(null);
    }
    setUsageLoading(false);
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Providers</h1>
            <p className="text-sm text-muted-foreground">
              Manage API provider connections and credentials.
            </p>
          </div>
          <Button onClick={() => { setShowCreate(true); setEditing(null); }}>
            <Plus className="w-4 h-4" /> Add Provider
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : providers.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Belum ada provider"
            description="Tambahkan koneksi API provider untuk mulai merutekan permintaan model."
          />
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
                    <th className="w-40 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providers.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.baseUrl}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          p.hasApiKey
                            ? "text-emerald-400 text-xs"
                            : "text-muted-foreground text-xs"
                        )}>
                          {p.hasApiKey ? "••••••••" : "None"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            p.isActive ? "bg-emerald-400" : "bg-muted-foreground"
                          )} />
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleShowUsage(p)}
                            title="Lihat Penggunaan"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                          {testResults[p.id] && (
                            <span className={cn(
                              "text-[10px] mr-1",
                              testResults[p.id].ok
                                ? "text-emerald-400"
                                : "text-destructive"
                            )}>
                              {testResults[p.id].ok
                                ? `${testResults[p.id].latency}ms`
                                : "Fail"}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleTestConnection(p.id)}
                            disabled={testingId === p.id}
                            aria-label="Test provider connection"
                            title="Test connection"
                          >
                            <RefreshCw className={cn(
                              "h-3.5 w-3.5",
                              testingId === p.id && "animate-spin"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => { setEditing(p); setShowCreate(true); }}
                            aria-label="Edit provider"
                            title="Edit provider"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(p.id)}
                            aria-label="Delete provider"
                            title="Delete provider"
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

        {/* Provider Create/Edit Dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            if (!open) { setShowCreate(false); setEditing(null); }
          }}
        >
          <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  {editing ? "Edit Provider" : "Add Provider"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {editing
                    ? "Update connection details and credentials."
                    : "Register a new API provider connection."}
                </DialogDescription>
              </div>
            </div>
            <ProviderForm
              provider={editing}
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
                fetchProviders();
                toast.success(editing ? "Provider updated" : "Provider created");
              }}
              onClose={() => { setShowCreate(false); setEditing(null); }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog
          open={!!deletingId}
          onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <DialogTitle>Delete Provider</DialogTitle>
              </div>
              <DialogDescription>
                Ini akan menghapus konfigurasi provider secara permanen.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Usage Modal */}
        <Dialog
          open={!!usageProvider}
          onOpenChange={(open) => { if (!open) { setUsageProvider(null); setUsageData(null); } }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Usage: {usageProvider?.name}</DialogTitle>
              <DialogDescription>Penggunaan API melalui provider ini.</DialogDescription>
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Model</th>
                            <th className="px-4 py-3 font-medium">Provider</th>
                            <th className="px-4 py-3 text-right font-medium">Requests</th>
                            <th className="px-4 py-3 text-right font-medium">Tokens</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {usageData.details.map((d, i) => (
                            <tr key={i} className="hover:bg-muted/40">
                              <td className="px-4 py-3 font-medium">{d.model}</td>
                              <td className="px-4 py-3 text-muted-foreground">{d.provider}</td>
                              <td className="px-4 py-3 text-right">{d.requests.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">{d.totalTokens.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Tidak ada data penggunaan model.
                  </p>
                )}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada data penggunaan.
              </p>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Close</Button>} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function ProviderForm({
  provider,
  onSave,
  onClose,
}: {
  provider: ProviderItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: provider?.name || "",
    baseUrl: provider?.baseUrl || "",
    apiKey: "",
    isActive: provider?.isActive ?? true,
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
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., My Provider"
                className="bg-background"
              />
            </div>
            <div>
              <Label>Base URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
                placeholder="https://api.provider.com/v1"
                className="bg-background"
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
                onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder={provider ? "Kosongkan untuk tidak mengubah" : "sk-..."}
                className="bg-background"
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
                <p className="text-sm font-medium">Provider Active</p>
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
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !form.name || !form.baseUrl}>
          {saving ? "Menyimpan..." : provider ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminProvidersPage() {
  return (
    <Suspense
      fallback={
        <AppShell variant="admin">
          <div className="h-full overflow-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-8 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-56 animate-pulse rounded bg-muted mt-2" />
              </div>
            </div>
            <TableSkeleton rows={5} cols={5} />
          </div>
        </AppShell>
      }
    >
      <AdminProvidersPageContent />
    </Suspense>
  );
}