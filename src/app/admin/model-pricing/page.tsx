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
import { formatCurrency } from "@/components/ui/format-currency";

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

type PricingDraft = Pick<
  PricedModel,
  | "costPer1kPrompt"
  | "costPer1kCompletion"
  | "markupPercent"
  | "sellPricePer1kPrompt"
  | "sellPricePer1kCompletion"
  | "tokenPlanPricePer1kPrompt"
  | "tokenPlanPricePer1kCompletion"
>;

const formatPrice = (value: number) =>
  value === 0 ? "Gratis" : formatCurrency(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

// Mirrors src/lib/pricing-engine.ts calcSellPrice
const calcSell = (cost: number, markupPercent: number) =>
  cost <= 0 ? 0 : Math.ceil(cost * (1 + markupPercent / 100));

// Mirrors src/lib/pricing-engine.ts calcMargin
const calcMarginPercent = (cost: number, sell: number) =>
  sell > 0 ? ((sell - cost) / sell) * 100 : 0;

// Token plan price must be between cost and PAYG sell price
const clampTokenPlan = (tokenPlan: number, cost: number, sell: number) =>
  Math.min(Math.max(tokenPlan, cost), Math.max(sell, cost));

const getDraft = (model: PricedModel): PricingDraft => ({
  costPer1kPrompt: model.costPer1kPrompt,
  costPer1kCompletion: model.costPer1kCompletion,
  markupPercent: model.markupPercent,
  sellPricePer1kPrompt: model.sellPricePer1kPrompt,
  sellPricePer1kCompletion: model.sellPricePer1kCompletion,
  // Default token plan price to sell price when unset (0/null)
  tokenPlanPricePer1kPrompt:
    model.tokenPlanPricePer1kPrompt > 0
      ? clampTokenPlan(model.tokenPlanPricePer1kPrompt, model.costPer1kPrompt, model.sellPricePer1kPrompt)
      : model.sellPricePer1kPrompt,
  tokenPlanPricePer1kCompletion:
    model.tokenPlanPricePer1kCompletion > 0
      ? clampTokenPlan(model.tokenPlanPricePer1kCompletion, model.costPer1kCompletion, model.sellPricePer1kCompletion)
      : model.sellPricePer1kCompletion,
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

  const updateDraft = (key: keyof PricingDraft, value: string) => {
    const number = Number(value);
    const parsed = Number.isFinite(number) ? number : 0;
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: parsed };
      // Recalculate sell price live from cost + markup when markup changes
      if (key === "markupPercent") {
        const oldSellP = next.sellPricePer1kPrompt;
        const oldSellC = next.sellPricePer1kCompletion;
        next.sellPricePer1kPrompt = calcSell(next.costPer1kPrompt, next.markupPercent);
        next.sellPricePer1kCompletion = calcSell(next.costPer1kCompletion, next.markupPercent);
        // Keep the token plan discount ratio when sell price changes
        if (oldSellP > 0) next.tokenPlanPricePer1kPrompt = Math.round(next.tokenPlanPricePer1kPrompt * next.sellPricePer1kPrompt / oldSellP);
        if (oldSellC > 0) next.tokenPlanPricePer1kCompletion = Math.round(next.tokenPlanPricePer1kCompletion * next.sellPricePer1kCompletion / oldSellC);
      }
      return next;
    });
  };

  // Clamp token plan price to [cost, sell] when leaving the field / before save
  const clampDraft = (d: PricingDraft): PricingDraft => ({
    ...d,
    tokenPlanPricePer1kPrompt: clampTokenPlan(d.tokenPlanPricePer1kPrompt, d.costPer1kPrompt, d.sellPricePer1kPrompt),
    tokenPlanPricePer1kCompletion: clampTokenPlan(d.tokenPlanPricePer1kCompletion, d.costPer1kCompletion, d.sellPricePer1kCompletion),
  });

  const savePricing = async () => {
    if (!editingModel || !draft) return;
    // Enforce [cost, sell] range before saving
    const normalized = clampDraft(draft);
    setDraft(normalized);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-model",
          id: editingModel.id,
          ...normalized,
        }),
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
                      <TableHead className="px-4 py-3 font-medium">Cost Prompt/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Cost Completion/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Markup</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Sell Prompt/1K</TableHead>
                      <TableHead className="px-4 py-3 font-medium">Sell Completion/1K</TableHead>
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
                          <Button variant="outline" size="icon-sm" onClick={() => openEditor(model)} aria-label={`Edit pricing ${model.name}`} title="Edit pricing">
                            <Edit3 className="h-3 w-3" />
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
                      <Label htmlFor="cost-prompt">Cost Prompt/1K</Label>
                      <Input className="bg-background" id="cost-prompt" type="text" inputMode="decimal" value={draft.costPer1kPrompt} onChange={(event) => updateDraft("costPer1kPrompt", event.target.value)} />
                      <p className="text-xs text-muted-foreground/60">Biaya token input (pertanyaan).</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost-completion">Cost Completion/1K</Label>
                      <Input className="bg-background" id="cost-completion" type="text" inputMode="decimal" value={draft.costPer1kCompletion} onChange={(event) => updateDraft("costPer1kCompletion", event.target.value)} />
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
                      <Label htmlFor="sell-prompt">Sell Prompt/1K (IDR)</Label>
                      <Input className="bg-background" id="sell-prompt" type="text" inputMode="decimal" value={draft.sellPricePer1kPrompt} onChange={(event) => updateDraft("sellPricePer1kPrompt", event.target.value)} />
                      <p className="text-xs text-muted-foreground">Margin {formatNumber(calcMarginPercent(draft.costPer1kPrompt, draft.sellPricePer1kPrompt))}%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell-completion">Sell Completion/1K (IDR)</Label>
                      <Input className="bg-background" id="sell-completion" type="text" inputMode="decimal" value={draft.sellPricePer1kCompletion} onChange={(event) => updateDraft("sellPricePer1kCompletion", event.target.value)} />
                      <p className="text-xs text-muted-foreground">Margin {formatNumber(calcMarginPercent(draft.costPer1kCompletion, draft.sellPricePer1kCompletion))}%</p>
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
                      <Label htmlFor="token-plan-prompt">Token Plan Prompt/1K</Label>
                      <Input className="bg-background" id="token-plan-prompt" type="text" inputMode="decimal" value={draft.tokenPlanPricePer1kPrompt} onChange={(event) => updateDraft("tokenPlanPricePer1kPrompt", event.target.value)} onBlur={() => { if (draft) setDraft(clampDraft(draft)); }} />
                      <p className="text-xs text-muted-foreground/60">
                        Rentang {formatPrice(draft.costPer1kPrompt)} – {formatPrice(draft.sellPricePer1kPrompt)} (cost – harga jual).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token-plan-completion">Token Plan Completion/1K</Label>
                      <Input className="bg-background" id="token-plan-completion" type="text" inputMode="decimal" value={draft.tokenPlanPricePer1kCompletion} onChange={(event) => updateDraft("tokenPlanPricePer1kCompletion", event.target.value)} onBlur={() => { if (draft) setDraft(clampDraft(draft)); }} />
                      <p className="text-xs text-muted-foreground/60">
                        Rentang {formatPrice(draft.costPer1kCompletion)} – {formatPrice(draft.sellPricePer1kCompletion)} (cost – harga jual).
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
