"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit3, Trash2, Box, RefreshCw, GripVertical, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSection, FormPanel } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { FormSelect } from "@/components/ui/form-select";
import { toast } from "sonner";

interface AggregatorItem {
  id: string;
  name: string;
}

interface AggregatorModel {
  id: string;
  name?: string;
  provider?: string;
  alreadyConfigured?: boolean;
}

interface AppModelItem {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  providerModelId: string | null;
  maxOutputTokens: number | null;
  isActive: boolean;
}

interface ModelTestResult {
  ok: boolean;
  status: number;
  latency: number;
  error?: string;
}

interface ModelForm {
  modelId: string;
  name: string;
  provider: string;
  providerModelId: string;
  maxOutputTokens: number | null;
  isActive: boolean;
}

// Susun ulang elemen array secara immutabel (dipakai untuk drag & drop model).
function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function AdminModelsPageContent() {
  const [models, setModels] = useState<AppModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AppModelItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ModelTestResult>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState("");

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return models;
    return models.filter((m) =>
      [m.name, m.modelId, m.provider, m.providerModelId]
        .some((v) => (v ?? "").toLowerCase().includes(term))
    );
  }, [models, search]);

  // Pindahkan model dari `from` ke `to` secara lokal (belum disimpan).
  const moveModel = (from: number, to: number) => {
    setModels((prev) => reorderList(prev, from, to));
  };

  // Simpan urutan model ke backend berdasarkan id array saat ini.
  const persistReorder = async (ids: string[]) => {
    setReordering(true);
    try {
      const res = await fetch("/api/admin/models/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Reorder failed" }));
        throw new Error(err?.error || "Reorder failed");
      }
      toast.success("Model order updated");
      fetchModels();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder models");
      // Kembalikan urutan ke kondisi server (belum berubah karena PATCH gagal).
      fetchModels();
    } finally {
      setReordering(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const response = await fetch("/api/admin/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result: ModelTestResult = await response.json();
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, status: 0, latency: 0, error: "Request failed" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteModel = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/models?id=${deletingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete model");
      setDeletingId(null);
      fetchModels();
      toast.success("Model deleted");
    } catch {
      toast.error("Failed to delete model");
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Models</h1>
            <p className="text-sm text-muted-foreground">
              Manage AI models, pricing, and availability.
            </p>
          </div>
          <Button onClick={() => {
              setShowCreate(true);
              setEditing(null);
            }}
          >
            <Plus className="w-4 h-4" /> Add Model
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search models..."
            className="pl-9"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : filteredModels.length === 0 ? (
          <EmptyState icon={Box} title="No models configured" description={search.trim() ? "Tidak ada model yang cocok dengan pencarian." : "Tambahkan model untuk mulai menjual akses ke model AI."} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/50 text-left text-muted-foreground">
                  <TableRow>
                    <TableHead className="w-10 px-3 py-3" aria-label="Urutan" />
                    <TableHead className="px-4 py-3 font-medium">Model</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Provider Model ID</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Public Model ID</TableHead>
                    <TableHead className="px-4 py-3 text-center font-medium">Status</TableHead>
                    <TableHead className="px-4 py-3 font-medium sr-only">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredModels.map((m) => {
                    const i = models.findIndex((x) => x.id === m.id);
                    return (
                      <TableRow
                        key={m.id}
                        className={cn(
                          "hover:bg-muted/40",
                          dragIndex === i && "opacity-50"
                        )}
                      >
                        <TableCell className="px-3 py-3">
                          <span
                            draggable={!reordering}
                            onDragStart={() => setDragIndex(i)}
                            onDragEnd={() => setDragIndex(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (dragIndex === null) return;
                              const from = dragIndex;
                              const to = i;
                              moveModel(from, to);
                              setDragIndex(null);
                              persistReorder(reorderList(models, from, to).map((x) => x.id));
                            }}
                            className={cn(
                              "flex cursor-grab items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing",
                              reordering && "cursor-wait opacity-50"
                            )}
                            title="Seret untuk urut ulang"
                            aria-label={`Seret model ${m.name} untuk mengurutkan`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {m.provider || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm tabular-nums font-mono text-muted-foreground">
                          {m.providerModelId || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm tabular-nums font-mono text-muted-foreground">
                          {m.modelId || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              m.isActive
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                m.isActive
                                  ? "bg-success"
                                  : "bg-muted-foreground"
                              )}
                            />
                            {m.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {testResults[m.id] && (
                              <span
                                className={cn(
                                  "text-xs mr-1",
                                  testResults[m.id].ok ? "text-success" : "text-destructive"
                                )}
                                title={testResults[m.id].error}
                              >
                                {testResults[m.id].ok ? `${testResults[m.id].latency}ms` : "Fail"}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Test model connection"
                              title="Test model connection"
                              onClick={() => handleTestConnection(m.id)}
                              disabled={testingId === m.id}
                            >
                              <RefreshCw className={cn("h-3.5 w-3.5", testingId === m.id && "animate-spin motion-reduce:animate-none")} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit model"
                              title="Edit model"
                              onClick={() => {
                                setEditing(m);
                                setShowCreate(true);
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingId(m.id)}
                              aria-label="Delete model"
                              title="Delete model"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Model Create/Edit Dialog */}
        <ModelForm
          open={showCreate}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreate(false);
              setEditing(null);
            }
          }}
          model={editing}
          onSave={async (data) => {
            const response = await fetch("/api/admin/models", {
              method: editing ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(editing ? { id: editing.id, ...data } : data),
            });
            if (!response.ok) {
              const error = await response.json().catch(() => null);
              throw new Error(getApiErrorMessage(error, "Failed to save model"));
            }
            setShowCreate(false);
            setEditing(null);
            fetchModels();
          }}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
        />

        {/* Model Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(open) => { if (!open) setDeletingId(null); }}
          title="Delete Model"
          description="This will permanently remove this model from the gateway. Existing API requests using this model will fail."
          confirmLabel={
            <>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </>
          }
          onConfirm={handleDeleteModel}
        />
      </div>
    </AppShell>
  );
}

function ModelForm({
  open,
  onOpenChange,
  model,
  onSave,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AppModelItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const isEdit = !!model;
  const [form, setForm] = useState<ModelForm>({
    modelId: "",
    name: "",
    provider: "",
    providerModelId: "",
    maxOutputTokens: null,
    isActive: true,
  });
  // Reset & pre-populate form setiap kali modal dibuka (open → true) atau
  // model berubah. Dipicu oleh `open`, bukan hanya `model`, karena saat
  // create→create model tetap null sehingga `useEffect([model])` tidak terpicu.
  useEffect(() => {
    if (!open) return;
    if (model) {
      setForm({
        modelId: model.modelId,
        name: model.name,
        provider: model.provider,
        providerModelId: model.providerModelId || "",
        maxOutputTokens: model.maxOutputTokens,
        isActive: model.isActive,
      });
    } else {
      setForm({
        modelId: "",
        name: "",
        provider: "",
        providerModelId: "",
        maxOutputTokens: null,
        isActive: true,
      });
    }
    setSelectedAggregatorId("");
    setAggregatorModels([]);
    setModelError("");
  }, [open, model]);
  const [saving, setSaving] = useState<boolean>(false);

  // Aggregator integration (only when creating new model)
  const [aggregators, setAggregators] = useState<AggregatorItem[]>([]);
  const [selectedAggregatorId, setSelectedAggregatorId] = useState<string>("");
  const [aggregatorModels, setAggregatorModels] = useState<AggregatorModel[]>([]);
  const [loadingAggregators, setLoadingAggregators] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");

  useEffect(() => {
    setLoadingAggregators(true);
    fetch("/api/admin/aggregators")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AggregatorItem[]) => {
        setAggregators(Array.isArray(data) ? data : []);
        setLoadingAggregators(false);
      })
      .catch(() => setLoadingAggregators(false));
  }, [isEdit]);

  useEffect(() => {
    if (!selectedAggregatorId) {
      setAggregatorModels([]);
      setModelError("");
      return;
    }
    setLoadingModels(true);
    setAggregatorModels([]);
    setModelError("");
    fetch(`/api/admin/aggregators/models?id=${selectedAggregatorId}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
          throw new Error(getApiErrorMessage(err, `HTTP ${r.status}`));
        }
        return r.json();
      })
      .then((data: { models: AggregatorModel[] }) => {
        const list = data.models || [];
        setAggregatorModels(list);
        if (list.length === 0) {
          setModelError("Aggregator tidak mengembalikan model apapun.");
        }
        setLoadingModels(false);
      })
      .catch((err: Error) => {
        const message = `Gagal ambil model: ${err.message}`;
        setModelError(message);
        toast.error(message);
        setLoadingModels(false);
      });
  }, [selectedAggregatorId]);

  const update = (key: keyof ModelForm, value: string | number | boolean | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Numeric input helpers ──
  const digitsOnly = (v: string) => v.replace(/\D/g, "");

  const fmtNumber = (n: number | null) => n != null ? new Intl.NumberFormat("id-ID").format(n) : "";
  const parsePricing = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    return isNaN(n) ? null : n;
  };

  const onNumericChange = (key: keyof ModelForm, raw: string) =>
    update(key, parseInt(digitsOnly(raw), 10) || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form as unknown as Record<string, unknown>);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  const selectedAggregator = aggregators.find((a) => a.id === selectedAggregatorId);
  const availableModels = aggregatorModels.filter((m) => !m.alreadyConfigured);
  const registeredModelIds = aggregatorModels.filter((m) => m.alreadyConfigured);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Box className="h-4 w-4 text-primary" />}
      title={model ? "Edit Model Mapping" : "Add Model Mapping"}
      description={
        model
          ? "Update public model ID, provider model ID, and availability."
          : "Select provider model, then customize the public model ID shown to API clients."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <svg className="animate-spin motion-reduce:animate-none -ml-1 mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              model ? "Update" : "Create"
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* ── Source ── */}
        <section>
          <FormSection>Source</FormSection>
          <FormPanel className="space-y-3">
            <p className="text-xs text-muted-foreground/70">
              Pick an aggregator and model to auto-fill the fields below, or type manually.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Aggregator
                </Label>
                <FormSelect
                  options={[
                    { value: "", label: loadingAggregators ? "Loading..." : "Select aggregator" },
                    ...aggregators.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                  value={
                    selectedAggregator
                      ? { value: selectedAggregator.id, label: selectedAggregator.name }
                      : { value: "", label: loadingAggregators ? "Loading..." : "Select aggregator" }
                  }
                  onChange={(v) => {
                    const agg = aggregators.find((a) => a.id === v);
                    setSelectedAggregatorId(v ?? "");
                    setForm((prev) => ({
                      ...prev,
                      modelId: "",
                      providerModelId: "",
                      name: "",
                      provider: agg ? agg.name : "",
                    }));
                  }}
                  disabled={loadingAggregators}
                  isClearable={false}
                  isSearchable={false}
                />
                {aggregators.length === 0 && !loadingAggregators && (
                  <p className="text-xs text-warning mt-1.5">
                    No active aggregators. Add one in Settings → Aggregator.
                  </p>
                )}
              </div>
              <div>
                <Label>
                  Provider Model
                </Label>
                <FormSelect
                  options={[
                    {
                      label: !selectedAggregatorId
                        ? "Choose an aggregator first"
                        : loadingModels
                          ? "Loading models..."
                          : availableModels.length === 0
                            ? "No models available"
                            : "Available",
                      options: availableModels.map((m) => ({ value: m.id, label: m.id })),
                    },
                    ...(registeredModelIds.length > 0
                      ? [
                          {
                            label: "Already registered",
                            options: registeredModelIds.map((m) => ({
                              value: m.id,
                              label: `${m.id} ✓`,
                              isDisabled: true,
                            })),
                          },
                        ]
                      : []),
                  ]}
                  value={
                    form.providerModelId
                      ? { value: form.providerModelId, label: form.providerModelId }
                      : null
                  }
                  onChange={(id) => {
                    const m = aggregatorModels.find((x) => x.id === id);
                    const suggestedModelId = id ?? "";
                    setForm((prev) => ({
                      ...prev,
                      modelId: prev.modelId || suggestedModelId,
                      providerModelId: id ?? "",
                      provider: selectedAggregator
                        ? selectedAggregator.name
                        : prev.provider,
                      name: prev.name || m?.name || suggestedModelId,
                    }));
                  }}
                  disabled={!selectedAggregatorId || loadingModels}
                  isClearable={false}
                  placeholder="Select a model"
                />
                {modelError && (
                  <p className="text-xs text-destructive mt-1.5">{modelError}</p>
                )}
              </div>
            </div>
          </FormPanel>
        </section>

        {/* ── General ── */}
        <section>
          <FormSection>General</FormSection>
          <FormPanel className="space-y-3">
            <div>
              <Label>
                Provider
              </Label>
              <Input
                value={form.provider}
                onChange={(e) => update("provider", e.target.value)}
                placeholder="e.g. deepseek"
                className="bg-background"
              />
            </div>
            <div>
              <Label>
                Provider Model ID
              </Label>
              <Input
                value={form.providerModelId}
                onChange={(e) => update("providerModelId", e.target.value)}
                placeholder="Actual model ID from the provider"
                className="bg-background font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">
                The actual model ID from the provider. This is the reference model ID.
              </p>
            </div>
            <div>
              <Label>
                Public Model ID
              </Label>
              <Input
                value={form.modelId}
                onChange={(e) => update("modelId", e.target.value)}
                placeholder="e.g. deepseek-flash"
                className="bg-background font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground/60 mt-1">
                The model name used by API clients. Customize this to mask the provider model ID.
              </p>
            </div>
            <div>
              <Label>
                Display Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Model display name"
                className="bg-background"
              />
            </div>
          </FormPanel>
        </section>

        {/* ── Output Limit ── */}
        <section>
          <FormSection>Output Tokens</FormSection>
          <FormPanel className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Use provider default</p>
                <p className="text-xs text-muted-foreground/60">
                  On uses the provider default. Off lets you set a manual limit.
                </p>
              </div>
              <Switch
                checked={form.maxOutputTokens === null}
                onChange={(useDefault) => update("maxOutputTokens", useDefault ? null : 8192)}
              />
            </div>
            {form.maxOutputTokens !== null && (
              <div>
                <Label>Max Output Tokens (manual)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxOutputTokens}
                  onChange={(event) => update("maxOutputTokens", Number(event.target.value) || 1)}
                />
              </div>
            )}
          </FormPanel>
        </section>

        {/* ── Status ── */}
        <section>
          <FormSection>Status</FormSection>
          <FormPanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Model Active</p>
                <p className="text-xs text-muted-foreground/60">
                  When inactive, this model will not be available for API requests.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => update("isActive", v)}
              />
            </div>
          </FormPanel>
        </section>
      </div>
    </FormDialog>
  );
}

export default function AdminModelsPage() {
  return (
    <Suspense
      fallback={
        <AppShell variant="admin">
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading</span>
          </div>
        </AppShell>
      }
    >
      <AdminModelsPageContent />
    </Suspense>
  );
}
