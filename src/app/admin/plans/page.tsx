"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  backend: string;
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

interface PlanForm {
  id?: string;
  name: string;
  description: string;
  type: string;
  backend: string;
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

const fmtRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const formatNumber = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
};

function AdminPlansPageContent() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || data);
      }
    } catch {
      setError("Failed to load plans");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDeletePlan = async () => {
    if (!deletingPlanId) return;
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/plans?id=${deletingPlanId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(err.error || "Delete failed");
      }
      setDeletingPlanId(null);
      fetchPlans();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete plan");
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Plans</h1>
            <p className="text-sm text-muted-foreground">Manage membership plans and pricing.</p>
          </div>
          <Button size="sm" onClick={() => { setShowCreate(true); setEditingPlan(null); }}>
            <Plus className="w-4 h-4 mr-2" /> New Plan
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={4} cols={8} />
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No plans configured.</p>
          </div>
                ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Harga</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Req/Hari</th>
                    <th className="px-4 py-3 text-right font-medium">Token/Bln</th>
                    <th className="px-4 py-3 text-center font-medium">Models</th>
                    <th className="px-4 py-3 text-center font-medium">Priority</th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {plan.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {plan.price === 0 ? (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full">
                            Free
                          </span>
                        ) : (
                          <span className="text-xs font-medium">
                            {fmtRupiah(plan.price)} / {plan.billingPeriod}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          plan.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            plan.isActive ? "bg-emerald-400" : "bg-muted-foreground"
                          )} />
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {plan.features.maxRequestsPerDay.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {formatNumber(plan.features.maxTokensPerMonth)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {plan.features.allowedModels.length === 0 ? "All" : plan.features.allowedModels.length}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full capitalize">
                          {plan.features.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingPlan(plan)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingPlanId(plan.id)}
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

        <Dialog
          open={editingPlan !== null || showCreate}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPlan(null);
              setShowCreate(false);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit Plan" : "Create Plan"}
              </DialogTitle>
            </DialogHeader>
            <PlanEditor
              plan={editingPlan}
              onSave={async (data) => {
                const isNew = !editingPlan;
                const url = "/api/admin/plans";
                const method = isNew ? "POST" : "PUT";
                // Flatten nested features -> top-level Prisma fields
                const payload = {
                  ...data,
                  maxRequestsPerDay: data.features.maxRequestsPerDay,
                  maxTokensPerPeriod: data.features.maxTokensPerMonth,
                  allowedModels: data.features.allowedModels,
                  allowedProviders: data.features.allowedProviders,
                  streaming: data.features.streaming,
                  imageGeneration: data.features.imageGeneration,
                  apiAccess: data.features.apiAccess,
                  priority: data.features.priority,
                };
                delete (payload as Record<string, unknown>).features;
                const res = await fetch(url, {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(
                    isNew ? payload : { id: editingPlan!.id, ...payload }
                  ),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ error: "Save failed" }));
                  throw new Error(err.error || "Save failed");
                }
                setEditingPlan(null);
                setShowCreate(false);
                fetchPlans();
              }}
              onClose={() => {
                setEditingPlan(null);
                setShowCreate(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!deletingPlanId}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingPlanId(null);
              setDeleteError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <DialogTitle>Delete Plan</DialogTitle>
              </div>
              <DialogDescription>
                Permanently delete this plan. Users with active subscriptions
                or packages on this plan cannot be removed.
              </DialogDescription>
            </DialogHeader>
            {deleteError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button variant="destructive" onClick={handleDeletePlan}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function PlanEditor({
  plan,
  onSave,
  onClose,
}: {
  plan: PlanItem | null;
  onSave: (data: PlanForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PlanForm>(
    plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description || "",
          type: plan.type,
          backend: plan.backend,
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          features: { ...plan.features },
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        }
      : {
          name: "",
          description: "",
          type: "subscription",
          backend: "aggregator",
          price: 0,
          billingPeriod: "monthly",
          features: {
            maxRequestsPerDay: 1000,
            maxTokensPerMonth: 1000000,
            allowedModels: [],
            allowedProviders: [],
            streaming: true,
            imageGeneration: false,
            apiAccess: true,
            priority: "normal",
          },
          isActive: true,
          sortOrder: 0,
        }
  );
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const update = (key: keyof PlanForm, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const updateFeatures = (
    key: keyof PlanForm["features"],
    value: string | number | boolean | string[]
  ) =>
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: value },
    }));

  const handleSave = async () => {
    setSaving(true);
    setEditorError("");
    try {
      await onSave(form);
    } catch (e: unknown) {
      setEditorError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        {editorError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {editorError}
          </div>
        )}
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
            <label className="text-xs text-muted-foreground block mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="subscription">Subscription</option>
              <option value="package">Package</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Backend</label>
            <select value={form.backend} onChange={(e) => update("backend", e.target.value)}
              className="w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="aggregator">Aggregator</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Price (IDR)
            </label>
            <Input
              type="number"
              value={form.price || 0}
              onChange={(e) =>
                update("price", parseInt(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Billing Period
            </label>
            <Select
              value={form.billingPeriod || "monthly"}
              onValueChange={(v) => update("billingPeriod", v || "monthly")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Max Requests/Day
            </label>
            <Input
              type="number"
              value={form.features?.maxRequestsPerDay || 0}
              onChange={(e) =>
                updateFeatures(
                  "maxRequestsPerDay",
                  parseInt(e.target.value) || 0
                )
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Max Tokens/Month
            </label>
            <Input
              type="number"
              value={form.features?.maxTokensPerMonth || 0}
              onChange={(e) =>
                updateFeatures(
                  "maxTokensPerMonth",
                  parseInt(e.target.value) || 0
                )
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Streaming
            </label>
            <Select
              value={form.features?.streaming ? "yes" : "no"}
              onValueChange={(v) =>
                updateFeatures("streaming", (v || "no") === "yes")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Image Generation
            </label>
            <Select
              value={form.features?.imageGeneration ? "yes" : "no"}
              onValueChange={(v) =>
                updateFeatures("imageGeneration", (v || "no") === "yes")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            Priority
          </label>
          <Select
            value={form.features?.priority || "normal"}
            onValueChange={(v) => updateFeatures("priority", v || "normal")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            Allowed Providers <span className="text-[10px] text-muted-foreground/60">(kosong = semua)</span>
          </label>
          <textarea
            value={form.features?.allowedProviders?.join(", ") || ""}
            onChange={(e) =>
              updateFeatures(
                "allowedProviders",
                e.target.value
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="openai, anthropic, google"
            rows={2}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Pisahkan dengan koma. Model hanya dari provider ini yang akan tampak.
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            Allowed Models <span className="text-[10px] text-muted-foreground/60">(kosong = semua)</span>
          </label>
          <textarea
            value={form.features?.allowedModels?.join(", ") || ""}
            onChange={(e) =>
              updateFeatures(
                "allowedModels",
                e.target.value
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="gpt-4o-mini, claude-haiku"
            rows={3}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Pisahkan dengan koma. Partial match — "gpt" akan cocok dengan "gpt-4o", "gpt-4o-mini", dll.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isActive !== false}
            onChange={(e) => update("isActive", e.target.checked)}
            className="rounded border-input accent-primary"
          />
          <span className="text-sm text-muted-foreground">Active</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : form.id ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function AdminPlansPage() {
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
            <TableSkeleton rows={5} cols={8} />
          </div>
        </AppShell>
      }
    >
      <AdminPlansPageContent />
    </Suspense>
  );
}
