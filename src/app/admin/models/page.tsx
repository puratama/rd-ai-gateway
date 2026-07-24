"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Box,
  AlertTriangle,
} from "lucide-react";
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

interface AppModelItem {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  source: string;
  category: string;
  contextWindow: number;
  costPer1kPrompt: number | null;
  costPer1kCompletion: number | null;
  markupPercent: number;
  sellPricePer1kPrompt: number | null;
  sellPricePer1kCompletion: number | null;
  isActive: boolean;
}

interface ModelForm {
  modelId: string;
  name: string;
  provider: string;
  source: string;
  category: string;
  contextWindow: number;
  costPer1kPrompt: number | null;
  costPer1kCompletion: number | null;
  markupPercent: number;
  sellPricePer1kPrompt: number | null;
  sellPricePer1kCompletion: number | null;
  isActive: boolean;
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
            <p className="text-sm">No models configured.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Cost/1K Prompt
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Cost/1K Completion
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Markup %
                    </th>
                    <th className="px-4 py-3 text-center font-medium">
                      Active
                    </th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {m.modelId}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{m.provider}</td>
                      <td className="px-4 py-3 capitalize">{m.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {m.costPer1kPrompt != null
                          ? `$${m.costPer1kPrompt.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {m.costPer1kCompletion != null
                          ? `$${m.costPer1kCompletion.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {m.markupPercent}%
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Model" : "Add Model"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update model pricing and settings."
                  : "Register a new AI model in the gateway."}
              </DialogDescription>
            </DialogHeader>
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
  const [form, setForm] = useState<ModelForm>(
    model
      ? {
          modelId: model.modelId,
          name: model.name,
          provider: model.provider,
          source: model.source,
          category: model.category,
          contextWindow: model.contextWindow,
          costPer1kPrompt: model.costPer1kPrompt,
          costPer1kCompletion: model.costPer1kCompletion,
          markupPercent: model.markupPercent,
          sellPricePer1kPrompt: model.sellPricePer1kPrompt,
          sellPricePer1kCompletion: model.sellPricePer1kCompletion,
          isActive: model.isActive,
        }
      : {
          modelId: "",
          name: "",
          provider: "",
          source: "puter",
          category: "chat",
          contextWindow: 4096,
          costPer1kPrompt: null,
          costPer1kCompletion: null,
          markupPercent: 0,
          sellPricePer1kPrompt: null,
          sellPricePer1kCompletion: null,
          isActive: true,
        }
  );
  const [saving, setSaving] = useState(false);

  const update = (key: keyof ModelForm, value: string | number | boolean | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form as unknown as Record<string, unknown>);
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Model ID
            </label>
            <Input
              value={form.modelId}
              onChange={(e) => update("modelId", e.target.value)}
              placeholder="e.g. gpt-4o"
              disabled={!!model}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. GPT-4o"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Provider
            </label>
            <select
              value={form.provider}
              onChange={(e) => update("provider", e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="puter">Puter</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="meta">Meta</option>
              <option value="mistral">Mistral</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Source
            </label>
            <select
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="puter">Puter</option>
              <option value="aggregator">Aggregator</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="chat">Chat</option>
              <option value="reasoning">Reasoning</option>
              <option value="coding">Coding</option>
              <option value="fast">Fast</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Context Window
            </label>
            <Input
              type="number"
              value={form.contextWindow}
              onChange={(e) =>
                update("contextWindow", parseInt(e.target.value) || 0)
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Cost/1K Prompt (USD)
            </label>
            <Input
              type="number"
              step="0.0001"
              value={form.costPer1kPrompt ?? ""}
              onChange={(e) =>
                update(
                  "costPer1kPrompt",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Cost/1K Completion (USD)
            </label>
            <Input
              type="number"
              step="0.0001"
              value={form.costPer1kCompletion ?? ""}
              onChange={(e) =>
                update(
                  "costPer1kCompletion",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Markup %
            </label>
            <Input
              type="number"
              value={form.markupPercent}
              onChange={(e) =>
                update("markupPercent", parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Active
            </label>
            <select
              value={form.isActive ? "yes" : "no"}
              onChange={(e) => update("isActive", e.target.value === "yes")}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : model ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function AdminModelsPage() {
  return (
    <Suspense
      fallback={
        <AppShell variant="admin">
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </AppShell>
      }
    >
      <AdminModelsPageContent />
    </Suspense>
  );
}
