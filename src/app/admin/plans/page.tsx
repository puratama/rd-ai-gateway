"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { FormSelect, type SelectOption } from "@/components/ui/form-select";
import {
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CreditCard,
  GripVertical,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { FormSection, FormPanel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string;
  features: {
    maxTokensPerMonth: number;
    allowedModels: string[];
    allModels: boolean;
    allowedProviders: string[];
    allProviders: boolean;
    streaming: boolean;
    imageGeneration: boolean;
    highlights: string[];
  };
  isActive: boolean;
  sortOrder: number;
}

interface PlanForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: string;
  features: {
    maxTokensPerMonth: number;
    allowedModels: string[];
    allModels: boolean;
    allowedProviders: string[];
    allProviders: boolean;
    streaming: boolean;
    imageGeneration: boolean;
    highlights: string[];
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

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

function AddManualItem({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const submit = () => {
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="bg-background"
      />
      <Button type="button" variant="outline" size="lg" className="shrink-0" disabled={!trimmed} onClick={submit}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AdminPlansPageContent() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

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
    try {
      const res = await fetch(`/api/admin/plans?id=${deletingPlanId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(err.error || "Delete failed");
      }
      setDeletingPlanId(null);
      fetchPlans();
      toast.success("Plan deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete plan");
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
          <Button className="gap-1.5" onClick={() => { setShowCreate(true); setEditingPlan(null); }}>
            <Plus className="w-4 h-4" /> New Plan
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
          <EmptyState title="Belum ada plan" description="Belum ada paket token yang dikonfigurasi. Klik 'Tambah' untuk membuat plan pertama." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Harga</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total Token</th>
                    <th className="px-4 py-3 text-center font-medium">Models</th>
                    <th className="w-16 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-50">
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
                            {fmtRupiah(plan.price)}
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
                        {formatNumber(plan.features.maxTokensPerMonth)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {plan.features.allModels ? "All" : plan.features.allowedModels.length}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingPlan(plan)
                            }
                            aria-label="Edit plan"
                            title="Edit plan"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingPlanId(plan.id)}
                            aria-label="Delete plan"
                            title="Delete plan"
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

        {/* Plan Create/Edit Dialog */}
        <Dialog
          open={editingPlan !== null || showCreate}
          onOpenChange={(open) => {
            if (!open) {
              setEditingPlan(null);
              setShowCreate(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{editingPlan ? "Edit Plan" : "Add Plan"}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {editingPlan
                    ? "Update plan details, quota, and feature access."
                    : "Create a membership plan or token package with quota and access rules."}
                </DialogDescription>
              </div>
            </div>
            <PlanEditor
              plan={editingPlan}
              onSave={async (data) => {
                const isNew = !editingPlan;
                const url = "/api/admin/plans";
                const method = isNew ? "POST" : "PUT";
                // Flatten nested features -> top-level Prisma fields
                const payload = {
                  ...data,
                  maxTokensPerPeriod: data.features.maxTokensPerMonth,
                  allowedModels: data.features.allowedModels,
                  allowedProviders: data.features.allowedProviders,
                  allModels: data.features.allModels,
                  allProviders: data.features.allProviders,
                  streaming: data.features.streaming,
                  imageGeneration: data.features.imageGeneration,
                  highlights: data.features.highlights,
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
                toast.success(isNew ? "Plan created" : "Plan updated");
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
                Permanently delete this plan. Users with active packages
                on this plan cannot be removed.
              </DialogDescription>
            </DialogHeader>
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
  const isEdit = !!plan;
  const [form, setForm] = useState<PlanForm>(
    plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description || "",
          price: plan.price,
          billingPeriod: plan.billingPeriod,
          features: { ...plan.features, allModels: plan.features.allModels ?? true, allProviders: plan.features.allProviders ?? true },
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        }
      : {
          name: "",
          description: "",
          price: 0,
          billingPeriod: "monthly",
          features: {
            maxTokensPerMonth: 1000000,
            allowedModels: [],
            allModels: true,
            allowedProviders: [],
            allProviders: true,
            streaming: true,
            imageGeneration: false,
            highlights: [],
          },
          isActive: true,
          sortOrder: 0,
        }
  );
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<{
    providers: string[];
    models: { modelId: string; name: string; provider: string }[];
  } | null>(null);

  // Load registered providers (aggregators) & models for checkbox options
  useEffect(() => {
    let active = true;
    (async () => {
      const [mRes, aRes] = await Promise.all([
        fetch("/api/admin/models"),
        fetch("/api/admin/aggregators"),
      ]);
      const models: { modelId: string; name: string; provider: string }[] = mRes.ok ? await mRes.json() : [];
      const aggrs: { name: string; isActive: boolean }[] = aRes.ok ? await aRes.json() : [];
      const slug = (n: string) => n.toLowerCase().replace(/\s+/g, "-");
      const providers = [...new Set(aggrs.filter((a) => a.isActive).map((a) => slug(a.name)))];
      if (active) setCatalog({ providers, models });
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleList = (key: "allowedModels" | "allowedProviders" | "highlights", value: string) =>
    setForm((prev) => {
      const list = prev.features[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, features: { ...prev.features, [key]: next } };
    });

  const addToList = (key: "allowedModels" | "allowedProviders" | "highlights", value: string) =>
    setForm((prev) => {
      if (prev.features[key].includes(value)) return prev;
      return { ...prev, features: { ...prev.features, [key]: [...prev.features[key], value] } };
    });

  const moveFeature = (from: number, to: number) =>
    setForm((prev) => {
      if (from === to) return prev;
      const next = [...prev.features.highlights];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, features: { ...prev.features, highlights: next } };
    });

  const periodOptions: SelectOption[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];
  const findOpt = (opts: SelectOption[], v: string) =>
    opts.find((o) => o.value === v) ?? null;

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

  // ── Numeric input helpers ──
  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const fmtNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
  const onNumericChange = (
    key: keyof PlanForm | keyof PlanForm["features"],
    raw: string
  ) => {
    const value = parseInt(digitsOnly(raw), 10) || 0;
    if (key === "price") update("price", value);
    else updateFeatures(key as keyof PlanForm["features"], value);
  };

  const handleSave = async () => {
    setSaving(true);
    setEditorError("");
    try {
      if (
        !form.features.allProviders &&
        form.features.allowedProviders.length === 0
      ) {
        throw new Error("Wajib pilih minimal satu provider saat 'Semua Provider' dimatikan.");
      }
      if (
        !form.features.allModels &&
        form.features.allowedModels.length === 0
      ) {
        throw new Error("Wajib pilih minimal satu model saat 'Semua Model' dimatikan.");
      }
      // Saat "Semua Model"/"Semua Provider" aktif, ikutkan seluruh yang terdaftar saat ini
      const payload = {
        ...form,
        features: {
          ...form.features,
          allowedModels:
            form.features.allModels && catalog
              ? catalog.models.map((m) => m.modelId)
              : form.features.allowedModels,
          allowedProviders:
            form.features.allProviders && catalog
              ? catalog.providers
              : form.features.allowedProviders,
        },
      };
      await onSave(payload);
    } catch (e: unknown) {
      setEditorError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {editorError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {editorError}
          </div>
        )}

        {/* ── General ── */}
        <section>
          <FormSection>General</FormSection>
          <FormPanel className="space-y-3">
            <div>
              <Label>Plan Name</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Pro"
                className="bg-background"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description || ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short plan description"
                className="bg-background"
              />
            </div>
          </FormPanel>
        </section>

        {/* ── Pricing ── */}
        <section>
          <FormSection>Pricing (IDR)</FormSection>
          <FormPanel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={fmtNumber(form.price)}
                  onChange={(e) => onNumericChange("price", e.target.value)}
                  placeholder="e.g. 50.000"
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  0 = free plan
                </p>
              </div>
              <div>
                <Label>Billing Period</Label>
                <FormSelect
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                  value={findOpt(periodOptions, form.billingPeriod || "monthly")}
                  onChange={(v) => update("billingPeriod", v ?? "monthly")}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>
          </FormPanel>
        </section>

        {/* ── Quota ── */}
        <section>
          <FormSection>Quota</FormSection>
          <FormPanel>
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={fmtNumber(form.features.maxTokensPerMonth)}
                onChange={(e) => onNumericChange("maxTokensPerMonth", e.target.value)}
                placeholder="e.g. 1.000.000"
                className="bg-background"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Jatah token di paket. Berlaku untuk paket &amp; token plan.
              </p>
            </div>
          </FormPanel>
        </section>

        {/* ── Features ── */}
        <section>
          <FormSection>Features</FormSection>
          <FormPanel className="space-y-4">
            {[
              {
                key: "streaming" as const,
                title: "Streaming",
                desc: "Allow streaming responses for this plan.",
              },
              {
                key: "imageGeneration" as const,
                title: "Image Generation",
                desc: "Allow image generation endpoints.",
              },
            ].map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground/60">{f.desc}</p>
                </div>
                <Switch
                  checked={form.features[f.key]}
                  onChange={(v) => updateFeatures(f.key, v)}
                />
              </div>
            ))}
          </FormPanel>
        </section>

        {/* ── Access ── */}
        <section>
          <FormSection>Access</FormSection>
          <FormPanel className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Semua Provider</p>
                <p className="text-xs text-muted-foreground/60">
                  {form.features.allProviders
                    ? "Semua provider diizinkan tanpa filter."
                    : "Matikan untuk membatasi ke provider tertentu."}
                </p>
              </div>
              <Switch
                checked={form.features.allProviders}
                onChange={(v) => updateFeatures("allProviders", v)}
              />
            </div>
            {!form.features.allProviders && (
              <div>
                <Label>
                  Allowed Providers <span className="text-red-500">*</span>
                </Label>
                <FormSelect
                  isMulti
                  options={(catalog?.providers ?? []).map((p) => ({
                    value: p,
                    label: p.charAt(0).toUpperCase() + p.slice(1),
                  }))}
                  value={(catalog?.providers ?? [])
                    .filter((p) => form.features.allowedProviders.includes(p))
                    .map((p) => ({
                      value: p,
                      label: p.charAt(0).toUpperCase() + p.slice(1),
                    }))}
                  onChange={(v) => updateFeatures("allowedProviders", v)}
                  placeholder="Tidak ada"
                  noOptionsMessage="Belum ada provider terdaftar (kelola di Admin → Aggregator)."
                />
                {form.features.allowedProviders.length === 0 ? (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Wajib pilih minimal satu provider.
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Hanya provider yang dipilih yang diizinkan.
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Semua Model</p>
                <p className="text-xs text-muted-foreground/60">
                  {form.features.allModels
                    ? "Semua model diizinkan tanpa filter."
                    : "Matikan untuk membatasi ke model tertentu."}
                </p>
              </div>
              <Switch
                checked={form.features.allModels}
                onChange={(v) => updateFeatures("allModels", v)}
              />
            </div>
            {!form.features.allModels && (
              <div>
                <Label>
                  Allowed Models <span className="text-red-500">*</span>
                </Label>
                <FormSelect
                  isMulti
                  options={(catalog?.models ?? []).map((m) => ({
                    value: m.modelId,
                    label: `${m.modelId} · ${m.provider}`,
                  }))}
                  value={(catalog?.models ?? [])
                    .filter((m) => form.features.allowedModels.includes(m.modelId))
                    .map((m) => ({
                      value: m.modelId,
                      label: `${m.modelId} · ${m.provider}`,
                    }))}
                  onChange={(v) => updateFeatures("allowedModels", v)}
                  placeholder="Tidak ada"
                  noOptionsMessage="Belum ada model terdaftar (kelola di Admin → Models)."
                />
                {(() => {
                  const orphan = form.features.allowedModels.filter(
                    (m) => !catalog?.models.some((c) => c.modelId === m)
                  );
                  if (!catalog || orphan.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {orphan.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5"
                        >
                          {m}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => toggleList("allowedModels", m)}
                            className="h-auto w-auto p-0 hover:text-amber-300 leading-none"
                            aria-label={`Remove orphan model ${m}`}
                            title="Remove orphan model"
                          >
                            ×
                          </Button>
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {form.features.allowedModels.length === 0 ? (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Wajib pilih minimal satu model.
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Hanya model yang dipilih yang diizinkan. Partial match: &quot;gpt&quot; cocok dengan &quot;gpt-4o&quot;, dst.
                  </p>
                )}
              </div>
            )}
          </FormPanel>
        </section>

        {/* ── Highlights ── */}
        <section>
          <FormSection>Highlights</FormSection>
          <FormPanel className="space-y-3">
            <AddManualItem
              placeholder='Tambah keunggulan (mis. "Full support")…'
              onAdd={(v) => addToList("highlights", v)}
            />
            {form.features.highlights.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/60">
                Belum ada highlight. Tambahkan teks bebas seperti &quot;Full support&quot;, &quot;Priority queue&quot;, dll.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/70">
                {form.features.highlights.map((f, i) => (
                  <li
                    key={f}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      moveFeature(dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={`group flex items-center justify-between gap-3 bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40 ${
                      dragIndex === i ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragEnd={() => setDragIndex(null)}
                        className="shrink-0 cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
                        title="Seret untuk urut ulang"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate">{f}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleList("highlights", f)}
                      className="shrink-0 border-border/70 text-muted-foreground/50 transition-colors hover:text-destructive"
                      aria-label="Hapus highlight"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </FormPanel>
        </section>

        {/* ── Status ── */}
        <section>
          <FormSection>Status</FormSection>
          <FormPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Plan Active</p>
                <p className="text-xs text-muted-foreground/60">
                  When inactive, this plan won&apos;t be available for purchase.
                </p>
              </div>
              <Switch
                checked={form.isActive !== false}
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
            isEdit ? "Update" : "Create"
          )}
        </Button>
      </div>
    </div>
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
