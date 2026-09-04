"use client";


import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";


import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { FormSection, FormPanel } from "@/components/ui/form";
import { toast } from "sonner";
import { Cpu, Edit3, RefreshCw, Search } from "lucide-react";

interface PricedModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  costPer1kPrompt: number;
  costPer1kCompletion: number;
  markupPercent: number;
  sellPricePer1kPrompt: number;
  sellPricePer1kCompletion: number;
  marginPercentPrompt: number;
  marginPercentCompletion: number;
  tokenPlanPricePer1kPrompt: number;
  tokenPlanPricePer1kCompletion: number;
  isActive: boolean;
}

type PricingField =
  | "costPer1kPrompt"
  | "costPer1kCompletion"
  | "markupPercent"
  | "sellPricePer1kPrompt"
  | "sellPricePer1kCompletion"
  | "tokenPlanPricePer1kPrompt"
  | "tokenPlanPricePer1kCompletion";

// Draft values are kept as raw strings so a trailing decimal point ("2.") is
// preserved while typing. They are parsed to numbers on calculation/save.
type PricingDraft = Record<PricingField, string>;

// Fractional IDR per 1K tokens (e.g. 0.0015) must not round to "Rp 0".
const formatPrice = (value: number) =>
  value === 0
    ? "Gratis"
    : `Rp ${value.toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      })}`;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

// Mirrors src/lib/pricing-engine.ts calcSellPrice
const calcSell = (cost: number, markupPercent: number) =>
  cost <= 0 ? 0 : Math.round(cost * (1 + markupPercent / 100) * 1e6) / 1e6;

// Mirrors src/lib/pricing-engine.ts calcMargin
const calcMarginPercent = (cost: number, sell: number) =>
  sell > 0 ? ((sell - cost) / sell) * 100 : 0;

// Token plan price must be between cost and PAYG sell price
const clampTokenPlan = (tokenPlan: number, cost: number, sell: number) =>
  Math.min(Math.max(tokenPlan, cost), Math.max(sell, cost));

const toNumericInput = (value: number | null | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : "0";
};

const getDraft = (model: PricedModel): PricingDraft => ({
  costPer1kPrompt: toNumericInput(model.costPer1kPrompt),
  costPer1kCompletion: toNumericInput(model.costPer1kCompletion),
  markupPercent: toNumericInput(model.markupPercent),
  sellPricePer1kPrompt: toNumericInput(model.sellPricePer1kPrompt),
  sellPricePer1kCompletion: toNumericInput(model.sellPricePer1kCompletion),
  tokenPlanPricePer1kPrompt: toNumericInput(
    model.tokenPlanPricePer1kPrompt > 0
      ? clampTokenPlan(model.tokenPlanPricePer1kPrompt, model.costPer1kPrompt, model.sellPricePer1kPrompt)
      : 0
  ),
  tokenPlanPricePer1kCompletion: toNumericInput(
    model.tokenPlanPricePer1kCompletion > 0
      ? clampTokenPlan(model.tokenPlanPricePer1kCompletion, model.costPer1kCompletion, model.sellPricePer1kCompletion)
      : 0
  ),
});

export default function AdminModelPricingPage() {
  const [models, setModels] = useState<PricedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingModel, setEditingModel] = useState<PricedModel | null>(null);
  const [draft, setDraft] = useState<PricingDraft | null>(null);
  const [search, setSearch] = useState("");

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/pricing");
      if (!response.ok) throw new Error("Failed to load pricing");
      const data = await response.json();
      setModels(data.models ?? []);
    } catch {
      toast.error("Failed to load model pricing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPricing();
  }, [fetchPricing]);

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return models;
    return models.filter((m) =>
      [m.name, m.modelId, m.provider].some((v) => (v ?? "").toLowerCase().includes(term))
    );
  }, [models, search]);

  const openEditor = (model: PricedModel) => {
    setEditingModel(model);
    setDraft(getDraft(model));
  };

  const closeEditor = (open: boolean) => {
    if (!open && !saving) {
      setEditingModel(null);
      setDraft(null);
    }
  };

  // Hanya angka dan satu titik desimal; nilai default 0 diganti saat angka baru diketik.
  const normalizeNumericInput = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    if (!cleaned) return "0";
    if (cleaned === ".") return "0.";
    if (/^0+\./.test(cleaned)) return `0.${cleaned.slice(cleaned.indexOf(".") + 1)}`;
    return cleaned.replace(/^0+(?=\d)/, "") || "0";
  };

  const updateDraft = (key: PricingField, value: string) => {
    const cleaned = normalizeNumericInput(value);
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: cleaned };
      // Recalculate sell price live from cost + markup when markup changes
      if (key === "markupPercent") {
        const markup = Number(cleaned) || 0;
        const costP = Number(next.costPer1kPrompt) || 0;
        const costC = Number(next.costPer1kCompletion) || 0;
        const oldSellP = Number(next.sellPricePer1kPrompt) || 0;
        const oldSellC = Number(next.sellPricePer1kCompletion) || 0;
        next.sellPricePer1kPrompt = String(calcSell(costP, markup));
        next.sellPricePer1kCompletion = String(calcSell(costC, markup));
        // Keep the token plan discount ratio when sell price changes
        if (oldSellP > 0) next.tokenPlanPricePer1kPrompt = String(Math.round((Number(next.tokenPlanPricePer1kPrompt) || 0) * calcSell(costP, markup) / oldSellP));
        if (oldSellC > 0) next.tokenPlanPricePer1kCompletion = String(Math.round((Number(next.tokenPlanPricePer1kCompletion) || 0) * calcSell(costC, markup) / oldSellC));
      }
      return next;
    });
  };

  // Clamp token plan price to [cost, sell] when leaving the field / before save
  const clampDraft = (d: PricingDraft): PricingDraft => {
    const costP = Number(d.costPer1kPrompt) || 0;
    const costC = Number(d.costPer1kCompletion) || 0;
    const sellP = Number(d.sellPricePer1kPrompt) || 0;
    const sellC = Number(d.sellPricePer1kCompletion) || 0;
    return {
      ...d,
      tokenPlanPricePer1kPrompt: String(clampTokenPlan(Number(d.tokenPlanPricePer1kPrompt) || 0, costP, sellP)),
      tokenPlanPricePer1kCompletion: String(clampTokenPlan(Number(d.tokenPlanPricePer1kCompletion) || 0, costC, sellC)),
    };
  };

  const savePricing = async () => {
    if (!editingModel || !draft) return;
    // Enforce [cost, sell] range before saving
    const normalized = clampDraft(draft);
    setDraft(normalized);
    // Convert raw string inputs back to numbers for the API
    const payload: Record<string, unknown> = { action: "update-model", id: editingModel.id };
    for (const [key, value] of Object.entries(normalized)) {
      payload[key] = Number(value);
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to save pricing");
      toast.success(`${editingModel.name} pricing updated`);
      setEditingModel(null);
      setDraft(null);
      await fetchPricing();
    } catch {
      toast.error("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Model Pricing</h1>
              <p className="text-sm text-muted-foreground">
                Monitor and manage model costs, markup, and token plan pricing.
              </p>
            </div>
            <Button variant="outline" size="icon-lg" onClick={() => void fetchPricing()} disabled={loading} aria-label="Refresh model pricing" title="Refresh model pricing">
              <RefreshCw className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
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
            <EmptyState
              icon={Cpu}
              title="No models found"
              description={search.trim() ? "Tidak ada model yang cocok dengan pencarian." : "Add a model first to configure pricing."}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader className="bg-muted/50 text-left text-muted-foreground">
                    <TableRow>
                      <TableHead className="px-4 py-3 font-medium">Model</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Cost Input/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Cost Output/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Markup</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Sell Input/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Sell Output/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                      <TableHead className="w-16 px-4 py-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {filteredModels.map((model) => (
                      <TableRow key={model.id} className="hover:bg-muted/40">
                        <TableCell className="px-4 py-3">
                          <div className="min-w-44">
                            <p className="font-medium">{model.name}</p>
                            <p className="truncate text-xs text-muted-foreground" title={model.modelId}>
                              {model.provider} · {model.modelId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{formatPrice(model.costPer1kPrompt)}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{formatPrice(model.costPer1kCompletion)}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{formatNumber(model.markupPercent)}%</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums font-medium">{formatPrice(model.sellPricePer1kPrompt)}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums font-medium">{formatPrice(model.sellPricePer1kCompletion)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <span className={model.isActive ? "text-success" : "text-muted-foreground"}>
                            {model.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditor(model)} aria-label={`Edit pricing ${model.name}`} title="Edit pricing">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>

      <FormDialog
        open={Boolean(editingModel)}
        onOpenChange={closeEditor}
        icon={<Cpu className="h-4 w-4 text-primary" />}
        title="Edit Model Pricing"
        description={`${editingModel?.name ?? ""} · all values use IDR per 1K tokens.`}
        footer={
          <>
            <Button variant="outline" onClick={() => closeEditor(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void savePricing()} disabled={saving || !draft}>
              {saving ? "Saving..." : "Save Pricing"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
              {/* ── Biaya (Harga Modal) ── */}
              <section>
                <FormSection>Biaya (Harga Modal)</FormSection>
                <FormPanel className="space-y-3">
                  <p className="text-xs text-muted-foreground/80">
                    Harga yang Anda bayarkan ke penyedia model per 1.000 token. Ini dasar
                    perhitungan markup dan margin.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cost-input">Cost Input/1K</Label>
                      <Input className="bg-background" id="cost-input" type="text" inputMode="decimal" value={draft.costPer1kPrompt} onChange={(event) => updateDraft("costPer1kPrompt", event.target.value)} />
                      <p className="text-xs text-muted-foreground/60">Biaya token input (pertanyaan).</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost-output">Cost Output/1K</Label>
                      <Input className="bg-background" id="cost-output" type="text" inputMode="decimal" value={draft.costPer1kCompletion} onChange={(event) => updateDraft("costPer1kCompletion", event.target.value)} />
                      <p className="text-xs text-muted-foreground/60">Biaya token output (jawaban).</p>
                    </div>
                  </div>
                </FormPanel>
              </section>

              {/* ── Markup ── */}
              <section>
                <FormSection>Markup</FormSection>
                <FormPanel className="space-y-3">
                  <p className="text-xs text-muted-foreground/80">
                    Persentase keuntungan di atas biaya. Mengubah nilai ini otomatis
                    menghitung ulang harga jual di bawah (sell = biaya × (1 + markup/100)).
                  </p>
                  <div className="max-w-55">
                    <Label htmlFor="markup">Markup %</Label>
                    <Input className="bg-background" id="markup" type="text" inputMode="decimal" value={draft.markupPercent} onChange={(event) => updateDraft("markupPercent", event.target.value)} />
                  </div>
                </FormPanel>
              </section>

              {/* ── Harga Jual PAYG ── */}
              <section>
                <FormSection>Harga Jual (Pay-As-You-Go)</FormSection>
                <FormPanel className="space-y-3">
                  <p className="text-xs text-muted-foreground/80">
                    Harga yang dibebankan ke pelanggan per 1.000 token untuk penggunaan
                    tanpa paket. Terisi otomatis dari markup, namun bisa diubah manual.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sell-input">Sell Input/1K (IDR)</Label>
                      <Input className="bg-background" id="sell-input" type="text" inputMode="decimal" value={draft.sellPricePer1kPrompt} onChange={(event) => updateDraft("sellPricePer1kPrompt", event.target.value)} />
                      <p className="text-xs text-muted-foreground">Margin {formatNumber(calcMarginPercent(Number(draft.costPer1kPrompt) || 0, Number(draft.sellPricePer1kPrompt) || 0))}%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell-output">Sell Output/1K (IDR)</Label>
                      <Input className="bg-background" id="sell-output" type="text" inputMode="decimal" value={draft.sellPricePer1kCompletion} onChange={(event) => updateDraft("sellPricePer1kCompletion", event.target.value)} />
                      <p className="text-xs text-muted-foreground">Margin {formatNumber(calcMarginPercent(Number(draft.costPer1kCompletion) || 0, Number(draft.sellPricePer1kCompletion) || 0))}%</p>
                    </div>
                  </div>
                </FormPanel>
              </section>

              {/* ── Harga Paket Token ── */}
              <section>
                <FormSection>Harga Paket Token</FormSection>
                <FormPanel className="space-y-3">
                  <p className="text-xs text-muted-foreground/80">
                    Harga khusus per 1.000 token untuk pelanggan yang memakai token
                    plan/package (biasanya lebih murah dari PAYG). Kosongkan untuk
                    menggunakan harga jual biasa.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="token-plan-input">Token Plan Input/1K</Label>
                      <Input className="bg-background" id="token-plan-input" type="text" inputMode="decimal" value={draft.tokenPlanPricePer1kPrompt} onChange={(event) => updateDraft("tokenPlanPricePer1kPrompt", event.target.value)} onBlur={() => { if (draft) setDraft(clampDraft(draft)); }} />
                      <p className="text-xs text-muted-foreground/60">
                        Rentang {formatPrice(Number(draft.costPer1kPrompt) || 0)} – {formatPrice(Number(draft.sellPricePer1kPrompt) || 0)} (cost – harga jual).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token-plan-output">Token Plan Output/1K</Label>
                      <Input className="bg-background" id="token-plan-output" type="text" inputMode="decimal" value={draft.tokenPlanPricePer1kCompletion} onChange={(event) => updateDraft("tokenPlanPricePer1kCompletion", event.target.value)} onBlur={() => { if (draft) setDraft(clampDraft(draft)); }} />
                      <p className="text-xs text-muted-foreground/60">
                        Rentang {formatPrice(Number(draft.costPer1kCompletion) || 0)} – {formatPrice(Number(draft.sellPricePer1kCompletion) || 0)} (cost – harga jual).
                      </p>
                    </div>
                  </div>
                </FormPanel>
              </section>
              </div>
            )}
      </FormDialog>
    </AppShell>
  );
}
