"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Box, AlertTriangle, RefreshCw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSection, FormPanel } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

function AdminModelsPageContent() {
  const [models, setModels] = useState<AppModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AppModelItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ModelTestResult>>({});

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
            <h1 className="text-2xl font-semibold">Models</h1>
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

        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : models.length === 0 ? (
          <EmptyState icon={Box} title="No models configured" description="Tambahkan model untuk mulai menjual akses ke model AI." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Provider Model ID</th>
                    <th className="px-4 py-3 font-medium">Public Model ID</th>
                    <th className="px-4 py-3 text-center font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {m.provider || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums font-mono text-muted-foreground">
                        {m.providerModelId || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums font-mono text-muted-foreground">
                        {m.modelId || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            m.isActive
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              m.isActive
                                ? "bg-emerald-400"
                                : "bg-muted-foreground"
                            )}
                          />
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {testResults[m.id] && (
                            <span
                              className={cn(
                                "text-[10px] mr-1",
                                testResults[m.id].ok ? "text-emerald-400" : "text-destructive"
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
                            <RefreshCw className={cn("h-3.5 w-3.5", testingId === m.id && "animate-spin")} />
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Model Create/Edit Dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreate(false);
              setEditing(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Box className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base">{editing ? "Edit Model Mapping" : "Add Model Mapping"}</DialogTitle>
                </div>
                <DialogDescription className="text-xs mt-0.5">
                  {editing
                    ? "Update public model ID, provider model ID, and availability."
                    : "Select provider model, then customize the public model ID shown to API clients."}
                </DialogDescription>
              </div>
            </div>
            <ModelForm
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
         </DialogContent>
       </Dialog>

        {/* Model Delete Confirmation */}
        <Dialog
          open={!!deletingId}
          onOpenChange={(open) => {
            if (!open) setDeletingId(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
               </div>
                <DialogTitle>Delete Model</DialogTitle>
             </div>
              <DialogDescription>
                This will permanently remove this model from the gateway.
                Existing API requests using this model will fail.
             </DialogDescription>
           </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button variant="destructive" onClick={handleDeleteModel}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   </AppShell>
  );
}

function ModelForm({
  model,
  onSave,
  onClose,
}: {
  model: AppModelItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const isEdit = !!model;
  const [form, setForm] = useState<ModelForm>(
    model
      ? {
          modelId: model.modelId,
          name: model.name,
          provider: model.provider,
          providerModelId: model.providerModelId || "",
          maxOutputTokens: model.maxOutputTokens,
          isActive: model.isActive,
        }
      : {
          modelId: "",
          name: "",
          provider: "",
          providerModelId: "",
          maxOutputTokens: null,
          isActive: true,
        }
  );
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
        setModelError(`Gagal ambil model: ${err.message}`);
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
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
                    setSelectedAggregatorId(v ?? "");
                    setForm((prev) => ({
                      ...prev,
                      modelId: "",
                      providerModelId: "",
                      name: "",
                      provider: "",
                    }));
                  }}
                  disabled={loadingAggregators}
                  isClearable={false}
                  isSearchable={false}
                />
                {aggregators.length === 0 && !loadingAggregators && (
                  <p className="text-[11px] text-amber-500 mt-1.5">
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
                        ? selectedAggregator.name.toLowerCase()
                        : prev.provider,
                      name: prev.name || m?.name || suggestedModelId,
                    }));
                  }}
                  disabled={!selectedAggregatorId || loadingModels}
                  isClearable={false}
                  placeholder="Select a model"
                />
                {modelError && (
                  <p className="text-[11px] text-destructive mt-1.5">{modelError}</p>
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
              <p className="text-[10px] text-muted-foreground/60 mt-1">
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
              <p className="text-[10px] text-muted-foreground/60 mt-1">
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
                  className="bg-background"
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

      {/* ── Footer ── */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/10">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            model ? "Update" : "Create"
          )}
        </Button>
      </div>
    </div>
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
