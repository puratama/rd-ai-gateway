"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Box, AlertTriangle } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

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
  contextWindow: number;
  sellPricePer1kPrompt: number | null;
  sellPricePer1kCompletion: number | null;
  isActive: boolean;
}

interface ModelForm {
  modelId: string;
  name: string;
  provider: string;
  providerModelId: string;
  contextWindow: number;
  sellPricePer1kPrompt: number | null;
  sellPricePer1kCompletion: number | null;
  isActive: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-emerald-500" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function AdminModelsPageContent() {
  const [models, setModels] = useState<AppModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<AppModelItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

  const handleDeleteModel = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/models?id=${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      fetchModels();
    } catch {
      setError("Failed to delete model");
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
          <Button
            size="sm"
            onClick={() => {
              setShowCreate(true);
              setEditing(null);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Model
         </Button>
       </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
         </div>
        )}

        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : models.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No models configured</p>
         </div>
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
                      Sell/1M Prompt
                   </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Sell/1M Completion
                   </th>
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
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {m.sellPricePer1kPrompt != null
                          ? `IDR ${m.sellPricePer1kPrompt.toFixed(2)}`
                          : "—"}
                     </td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                        {m.sellPricePer1kCompletion != null
                          ? `IDR ${m.sellPricePer1kCompletion.toFixed(2)}`
                          : "—"}
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(m);
                              setShowCreate(true);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                         </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(m.id)}
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
                    ? "Update public model ID, provider model ID, pricing, and availability."
                    : "Select provider model, then customize the public model ID shown to API clients."}
                </DialogDescription>
              </div>
            </div>
            <ModelForm
              model={editing}
              onSave={async (data) => {
                if (editing) {
                  await fetch("/api/admin/models", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: editing.id,
                      ...data,
                    }),
                  });
                } else {
                  await fetch("/api/admin/models", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
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
          contextWindow: model.contextWindow,
          sellPricePer1kPrompt: model.sellPricePer1kPrompt,
          sellPricePer1kCompletion: model.sellPricePer1kCompletion,
          isActive: model.isActive,
        }
      : {
          modelId: "",
          name: "",
          provider: "",
          providerModelId: "",
          contextWindow: 4096,
          sellPricePer1kPrompt: null,
          sellPricePer1kCompletion: null,
          isActive: true,
        }
  );
  const [saving, setSaving] = useState(false);

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
          throw new Error(err.error || `HTTP ${r.status}`);
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

  const onPricingChange = (key: keyof ModelForm, raw: string) =>
    update(key, parsePricing(raw));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form as unknown as Record<string, unknown>);
    setSaving(false);
  };

  const selectedAggregator = aggregators.find((a) => a.id === selectedAggregatorId);
  const availableModels = aggregatorModels.filter((m) => !m.alreadyConfigured);
  const registeredModelIds = aggregatorModels.filter((m) => m.alreadyConfigured);

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* ── Source ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-0.5 rounded-full bg-primary/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs text-muted-foreground/70">
              Pick an aggregator and model to auto-fill the fields below, or type manually.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Aggregator
                </label>
                <select
                  value={selectedAggregatorId}
                  onChange={(e) => {
                    setSelectedAggregatorId(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      modelId: "",
                      providerModelId: "",
                      name: "",
                      provider: "",
                    }));
                  }}
                  disabled={loadingAggregators}
                  className="w-full h-9 px-3 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 disabled:opacity-50"
                >
                  <option value="">
                    {loadingAggregators ? "Loading..." : "Select aggregator"}
                  </option>
                  {aggregators.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {aggregators.length === 0 && !loadingAggregators && (
                  <p className="text-[11px] text-amber-500 mt-1.5">
                    No active aggregators. Add one in Settings → Aggregator.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Provider Model
                </label>
                <select
                  value={form.providerModelId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const m = aggregatorModels.find((x) => x.id === id);
                    const suggestedModelId = id ? id : "";
                    setForm((prev) => ({
                      ...prev,
                      modelId: prev.modelId || suggestedModelId,
                      providerModelId: id,
                      provider: selectedAggregator
                        ? selectedAggregator.name.toLowerCase()
                        : prev.provider,
                      name: prev.name || m?.name || suggestedModelId,
                    }));
                  }}
                  disabled={!selectedAggregatorId || loadingModels}
                  className="w-full h-9 px-3 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 disabled:opacity-50"
                >
                  <option value="">
                    {!selectedAggregatorId
                      ? "Choose an aggregator first"
                      : loadingModels
                        ? "Loading models..."
                        : availableModels.length === 0
                          ? "No models available"
                          : "Select a model"}
                  </option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                  {registeredModelIds.length > 0 && (
                    <optgroup label="Already registered">
                      {registeredModelIds.map((m) => (
                        <option key={m.id} value={m.id} disabled>
                          {m.id} ✓
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {modelError && (
                  <p className="text-[11px] text-destructive mt-1.5">{modelError}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── General ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-0.5 rounded-full bg-primary/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              General
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Provider
              </label>
              <Input
                value={form.provider}
                onChange={(e) => update("provider", e.target.value)}
                placeholder="e.g. deepseek"
                className="h-9 bg-background"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Provider Model ID
              </label>
              <Input
                value={form.providerModelId}
                onChange={(e) => update("providerModelId", e.target.value)}
                placeholder="Actual model ID from the provider"
                className="h-9 bg-background font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                The actual model ID from the provider. This is the reference model ID.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Public Model ID
              </label>
              <Input
                value={form.modelId}
                onChange={(e) => update("modelId", e.target.value)}
                placeholder="e.g. deepseek-flash"
                className="h-9 bg-background font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                The model name used by API clients. Customize this to mask the provider model ID.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Display Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Model display name"
                className="h-9 bg-background"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                Context Window
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={fmtNumber(form.contextWindow)}
                onChange={(e) => onNumericChange("contextWindow", e.target.value)}
                className="h-9 bg-background"
              />
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-0.5 rounded-full bg-primary/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pricing (IDR)
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Sell/1M Prompt
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={fmtNumber(form.sellPricePer1kPrompt)}
                  onChange={(e) => onPricingChange("sellPricePer1kPrompt", e.target.value)}
                  placeholder="e.g. 10.000"
                  className="h-9 bg-background"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Sell/1M Completion
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={fmtNumber(form.sellPricePer1kCompletion)}
                  onChange={(e) => onPricingChange("sellPricePer1kCompletion", e.target.value)}
                  placeholder="e.g. 10.000"
                  className="h-9 bg-background"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Status ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-0.5 rounded-full bg-primary/60" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Model Active</p>
                <p className="text-xs text-muted-foreground/60">
                  When inactive, this model won't be available for API requests.
                </p>
              </div>
              <ToggleSwitch
                checked={form.isActive}
                onChange={(v) => update("isActive", v)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/10">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
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
