"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, DollarSign, Percent, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/ui/form-select";

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

interface PricingData {
  models: PricedModel[];
  providers: string[];
}

const fmtRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();

export default function PricingTab() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkMarkup, setBulkMarkup] = useState("20");
  const [bulkProvider, setBulkProvider] = useState("");

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"markup" | "costP" | "costC" | "tpP" | "tpC">("markup");
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  const handleBulkMarkup = async () => {
    setSubmitting(true);
    try {
      const filter: Record<string, string> = {};
      if (bulkProvider) filter.provider = bulkProvider;
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-markup", markupPercent: parseFloat(bulkMarkup) || 0, filter: Object.keys(filter).length ? filter : undefined }),
      });
      fetchPricing();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleEditModel = async (id: string, field: "markup" | "costP" | "costC" | "tpP" | "tpC") => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { action: "update-model", id };
      if (field === "markup") body.markupPercent = parseFloat(editValue) || 0;
      else if (field === "costP") body.costPer1kPrompt = parseFloat(editValue) || 0;
      else if (field === "costC") body.costPer1kCompletion = parseFloat(editValue) || 0;
      else if (field === "tpP") body.tokenPlanPricePer1kPrompt = parseFloat(editValue) || 0;
      else if (field === "tpC") body.tokenPlanPricePer1kCompletion = parseFloat(editValue) || 0;
      await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditingId(null);
      fetchPricing();
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const filtered = data?.models.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.modelId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];

  const totalCost = data?.models.reduce((s, m) => s + m.costPer1kPrompt + m.costPer1kCompletion, 0) ?? 0;
  const totalSell = data?.models.reduce((s, m) => s + m.sellPricePer1kPrompt + m.sellPricePer1kCompletion, 0) ?? 0;
  const avgMarkup = data?.models.length ? Math.round(data.models.reduce((s, m) => s + m.markupPercent, 0) / data.models.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pricing Engine</h1>
          <p className="text-sm text-muted-foreground">Manage model pricing, markup, and margin preview.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPricing} className="cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Avg Cost (1K)</div>
              <div className="text-lg font-semibold">{fmtRupiah(totalCost / (data.models.length || 1))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Avg Sell (1K)</div>
              <div className="text-lg font-semibold">{fmtRupiah(totalSell / (data.models.length || 1))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Avg Markup</div>
              <div className="text-lg font-semibold">{avgMarkup}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk markup */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            Bulk Markup Update
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Markup %</label>
              <input
                type="number"
                value={bulkMarkup}
                onChange={(e) => setBulkMarkup(e.target.value)}
                className="w-24 h-9 px-3 bg-background border border-input rounded-md text-sm"
                min="0"
                max="500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Filter Provider</label>
              <FormSelect
                options={[
                  { value: "", label: "All Providers" },
                  ...(data?.providers ?? []).map((p) => ({ value: p, label: p })),
                ]}
                value={
                  bulkProvider === ""
                    ? { value: "", label: "All Providers" }
                    : { value: bulkProvider, label: bulkProvider }
                }
                onChange={(v) => setBulkProvider(v ?? "")}
                isSearchable={false}
                className="w-48"
              />
            </div>

            <Button size="sm" onClick={handleBulkMarkup} disabled={submitting} className="cursor-pointer">
              {submitting ? "Updating..." : "Apply Bulk"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          className="w-full h-9 pl-9 pr-3 bg-background border border-input rounded-md text-sm"
        />
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="animate-pulse">
            <div className="h-11 bg-muted/50" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 border-t border-border flex items-center gap-4 px-4">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : !data?.models.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No models with pricing data.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 text-right font-medium">Cost (1K)</th>
                  <th className="px-4 py-3 text-right font-medium">Markup</th>
                  <th className="px-4 py-3 text-right font-medium">PAYG (1K)</th>
                  <th className="px-4 py-3 text-right font-medium">Token Plan (1K)</th>
                  <th className="px-4 py-3 text-right font-medium">Margin</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => {
                  const avgCost = (m.costPer1kPrompt + m.costPer1kCompletion) / 2;
                  const avgSell = (m.sellPricePer1kPrompt + m.sellPricePer1kCompletion) / 2;
                  return (
                    <tr key={m.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.modelId}</div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{m.provider}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {editingId === m.id && editingField === "costP" ? (
                          "—"
                        ) : (
                          <button
                            className="hover:underline underline-offset-2 decoration-dotted cursor-pointer"
                            onClick={() => { setEditingId(m.id); setEditingField("costP"); setEditValue(String(m.costPer1kPrompt)); }}
                          >
                            {fmtRupiah(m.costPer1kPrompt)}
                          </button>
                        )}
                        /{editingId === m.id && editingField === "costC" ? (
                          "—"
                        ) : (
                          <button
                            className="hover:underline underline-offset-2 decoration-dotted cursor-pointer"
                            onClick={() => { setEditingId(m.id); setEditingField("costC"); setEditValue(String(m.costPer1kCompletion)); }}
                          >
                            {fmtRupiah(m.costPer1kCompletion)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right pr-2">
                        {editingId === m.id && editingField === "markup" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 h-7 px-2 bg-background border border-input rounded text-xs text-right"
                              min="0"
                              autoFocus
                            />%
                            <Button size="xs" variant="ghost" onClick={() => handleEditModel(m.id, "markup")} disabled={submitting} className="h-7 text-xs">OK</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">X</Button>
                          </div>
                        ) : editingId === m.id && editingField === "costP" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 h-7 px-2 bg-background border border-input rounded text-xs text-right"
                              min="0"
                              autoFocus
                            />
                            <Button size="xs" variant="ghost" onClick={() => handleEditModel(m.id, "costP")} disabled={submitting} className="h-7 text-xs">OK</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">X</Button>
                          </div>
                        ) : editingId === m.id && editingField === "costC" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 h-7 px-2 bg-background border border-input rounded text-xs text-right"
                              min="0"
                              autoFocus
                            />
                            <Button size="xs" variant="ghost" onClick={() => handleEditModel(m.id, "costC")} disabled={submitting} className="h-7 text-xs">OK</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">X</Button>
                          </div>
                        ) : (
                          <button
                            className="tabular-nums font-semibold text-right cursor-pointer hover:underline underline-offset-2 decoration-dotted"
                            onClick={() => { setEditingId(m.id); setEditingField("markup"); setEditValue(String(m.markupPercent)); }}
                          >
                            {m.markupPercent}%
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtRupiah(avgSell)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {editingId === m.id && editingField === "tpP" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 h-7 px-2 bg-background border border-input rounded text-xs text-right"
                              min="0"
                              autoFocus
                            />
                            <Button size="xs" variant="ghost" onClick={() => handleEditModel(m.id, "tpP")} disabled={submitting} className="h-7 text-xs">OK</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">X</Button>
                          </div>
                        ) : (
                          <button
                            className="hover:underline underline-offset-2 decoration-dotted cursor-pointer"
                            onClick={() => { setEditingId(m.id); setEditingField("tpP"); setEditValue(String(m.tokenPlanPricePer1kPrompt)); }}
                          >
                            {fmtRupiah(m.tokenPlanPricePer1kPrompt)}
                          </button>
                        )}
                        /{editingId === m.id && editingField === "tpC" ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 h-7 px-2 bg-background border border-input rounded text-xs text-right"
                              min="0"
                              autoFocus
                            />
                            <Button size="xs" variant="ghost" onClick={() => handleEditModel(m.id, "tpC")} disabled={submitting} className="h-7 text-xs">OK</Button>
                            <Button size="xs" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs">X</Button>
                          </div>
                        ) : (
                          <button
                            className="hover:underline underline-offset-2 decoration-dotted cursor-pointer"
                            onClick={() => { setEditingId(m.id); setEditingField("tpC"); setEditValue(String(m.tokenPlanPricePer1kCompletion)); }}
                          >
                            {fmtRupiah(m.tokenPlanPricePer1kCompletion)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={`text-xs font-medium ${(m.marginPercentPrompt + m.marginPercentCompletion) / 2 >= 30 ? "text-emerald-400" : "text-amber-400"}`}>
                          {((m.marginPercentPrompt + m.marginPercentCompletion) / 2).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          m.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                        )}>
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            m.isActive ? "bg-emerald-400" : "bg-muted-foreground"
                          )} />
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => { setEditingId(m.id); setEditingField("markup"); setEditValue(String(m.markupPercent)); }}
                          title="Edit Markup"
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {filtered.length} models · Click markup % to edit
          </div>
        </div>
      )}
    </div>
  );
}