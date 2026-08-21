"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Gauge,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/ui/form-select";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchPricingFromDB } from "@/lib/pricing-db";
import type { ModelPricing } from "@/types";

function getProviders(models: ModelPricing[]) { return Array.from(new Set(models.map((m) => m.provider))); }
function formatPrice(n: number) { return n === 0 ? "Free" : n.toFixed(2); }
function getMinPrice(models: ModelPricing[]) { return models.reduce((min, m) => Math.min(min, m.pricing.prompt), Infinity); }
function getMaxPrice(models: ModelPricing[]) { return models.reduce((max, m) => Math.max(max, m.pricing.prompt), 0); }

const speedColor = (speed: string) =>
  speed === "fast" ? "text-emerald-400" : speed === "balanced" ? "text-amber-400" : speed === "slow" ? "text-rose-400" : "text-muted-foreground";
const speedBg = (speed: string) =>
  speed === "fast" ? "bg-emerald-500/10 border-emerald-500/20" : speed === "balanced" ? "bg-amber-500/10 border-amber-500/20" : speed === "slow" ? "bg-rose-500/10 border-rose-500/20" : "bg-muted/20 border-border";
const speedLabel = (speed: string) =>
  speed === "fast" ? "⚡ Fast" : speed === "balanced" ? "⚖️ Balanced" : speed === "slow" ? "🐢 Slow" : speed;


export default function ModelsPage() {
  const [pricingData, setPricingData] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");

  const [sortBy, setSortBy] = useState<"name" | "prompt" | "completion">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  useEffect(() => {
    fetchPricingFromDB().then((data) => { setPricingData(data); setLoading(false); });
  }, []);

  const providers = useMemo(() => getProviders(pricingData), [pricingData]);

  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pricingData.forEach((m) => { counts[m.provider] = (counts[m.provider] || 0) + 1; });
    return counts;
  }, [pricingData]);

  const filteredModels = useMemo(() => {
    let result = [...pricingData];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    }
    if (selectedProvider !== "all") result = result.filter((m) => m.provider === selectedProvider);
    result.sort((a, b) => {
      const cmp = sortBy === "name"
        ? a.name.localeCompare(b.name)
        : sortBy === "prompt"
          ? a.pricing.prompt - b.pricing.prompt
          : sortBy === "completion"
            ? a.pricing.completion - b.pricing.completion
            : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return result;
  }, [pricingData, search, selectedProvider, sortBy, sortOrder]);

  const toggleCompare = (modelId: string) => {
    setCompareList((prev) => prev.includes(modelId) ? prev.filter((id) => id !== modelId) : prev.length < 4 ? [...prev, modelId] : prev);
  };

  const toggleSort = (field: "name" | "prompt" | "completion") => {
    if (sortBy === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const renderPriceBadge = (value: number, label: string) => (
    <div className="text-center">
      <p className="text-xs text-muted-foreground/70">{label}</p>
      <p className="text-sm font-semibold tabular-nums tracking-tight text-foreground">{formatPrice(value)}</p>
    </div>
  );

  const SortArrow = ({ field }: { field: "name" | "prompt" | "completion" }) =>
    sortBy === field ? (
      sortOrder === "asc" ? <ChevronUp className="ml-0.5 h-3 w-3" /> : <ChevronDown className="ml-0.5 h-3 w-3" />
    ) : null;

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          {/* Hero header */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> Models
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Browse AI Models</h1>
              <p className="text-sm text-muted-foreground">Compare models by cost, context window, speed, and quality across all providers.</p>
            </div>
            <Button
              variant={compareMode ? "default" : "outline"}
              onClick={() => setCompareMode(!compareMode)}
              className={cn(compareMode && "shadow-lg shadow-primary/20")}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {compareMode ? "Exit Compare" : "Compare Models"}
            </Button>
          </header>

          {/* Stats bar */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Models", value: pricingData.length, icon: Layers, tone: "text-blue-500" },
              { label: "Providers", value: providers.length, icon: Layers, tone: "text-violet-500" },
              { label: "Cheapest Prompt", value: `${formatPrice(getMinPrice(pricingData))}/1K`, icon: Coins, tone: "text-emerald-500" },
              { label: "Most Expensive", value: `${formatPrice(getMaxPrice(pricingData))}/1K`, icon: Coins, tone: "text-amber-500" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className={cn("h-4 w-4", stat.tone)} /> {stat.label}
                    </div>
                    <div className={cn("mt-3 text-3xl font-semibold", loading && "animate-pulse text-muted-foreground")}>{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search models by name, ID, or provider..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Provider</span>
              <FormSelect
                options={[
                  { value: "all", label: `All (${pricingData.length})` },
                  ...providers.map((p) => ({ value: p, label: `${p} (${providerCounts[p] || 0})` })),
                ]}
                value={
                  selectedProvider === "all"
                    ? { value: "all", label: `All (${pricingData.length})` }
                    : {
                        value: selectedProvider,
                        label: `${selectedProvider} (${providerCounts[selectedProvider] || 0})`,
                      }
                }
                onChange={(v) => setSelectedProvider(v ?? "all")}
                isSearchable={false}
                isClearable={false}
                className="w-40"
              />
            </div>
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading models..." : `Showing ${filteredModels.length} of ${pricingData.length} models`}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Sort:</span>
              {(["name", "prompt", "completion"] as const).map((field) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={cn(
                    "flex items-center rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                    sortBy === field
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {field === "name" ? "Name" : field === "prompt" ? "Prompt IDR" : "Completion IDR"}
                  <SortArrow field={field} />
                </Button>
              ))}
            </div>
          </div>

          {/* Compare bar */}
          {compareMode && compareList.length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
                    {compareList.length}
                  </div>
                  <span className="text-xs text-primary">
                    model{compareList.length > 1 ? "s" : ""} selected
                    {compareList.length < 2 ? " — select at least 2 to compare" : ""}
                  </span>
                </div>
                {compareList.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setCompareList([])} className="h-7 text-xs">
                      Clear
                    </Button>
                    <Button size="sm" onClick={() => setExpandedModel("compare")} className="h-7 gap-1 text-xs">
                      <ArrowLeftRight className="h-3 w-3" /> Compare Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comparison table modal */}
          <Dialog open={expandedModel === "compare" && compareList.length >= 2} onOpenChange={(open) => { if (!open) setExpandedModel(null); }}>
            <DialogContent className="sm:max-w-5xl p-0 overflow-hidden border-primary/20">
              <DialogHeader className="border-b border-border bg-muted/20 px-6 py-4">
                <DialogTitle className="text-base font-semibold">Model Comparison</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="sticky left-0 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground">Feature</th>
                      {compareList.map((id) => {
                        const m = pricingData.find((m) => m.id === id);
                        return (
                          <th key={id} className="px-4 py-3 text-left text-xs font-semibold">{m?.name || id}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "provider", label: "Provider" },
                      { key: "speed", label: "Speed", render: (m: ModelPricing) => speedLabel(m.speed) },
                      { key: "quality", label: "Quality" },
                    ].map((row) => (
                      <tr key={row.key} className="border-b border-border last:border-b-0">
                        <td className="sticky left-0 bg-card px-4 py-3 text-xs text-muted-foreground">{row.label}</td>
                        {compareList.map((id) => {
                          const m = pricingData.find((m) => m.id === id);
                          if (!m) return <td key={id} className="px-4 py-3 text-xs" />;
                          const val = row.render ? row.render(m) : String(m[row.key as keyof ModelPricing] ?? "");
                          return <td key={id} className="px-4 py-3 text-xs">{val}</td>;
                        })}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/20 bg-primary/5">
                      <td className="sticky left-0 bg-primary/5 px-4 py-3 text-xs font-medium text-primary">Prompt IDR/1K</td>
                      {compareList.map((id) => {
                        const m = pricingData.find((m) => m.id === id);
                        return <td key={id} className="px-4 py-3 text-xs font-semibold tabular-nums">{m ? formatPrice(m.pricing.prompt) : "-"}</td>;
                      })}
                    </tr>
                    <tr className="bg-primary/5">
                      <td className="sticky left-0 bg-primary/5 px-4 py-3 text-xs font-medium text-primary">Completion IDR/1K</td>
                      {compareList.map((id) => {
                        const m = pricingData.find((m) => m.id === id);
                        return <td key={id} className="px-4 py-3 text-xs font-semibold tabular-nums">{m ? formatPrice(m.pricing.completion) : "-"}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Model grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse shadow-none">
                  <CardContent className="p-5">
                    <div className="mb-3 h-4 w-3/4 rounded bg-muted" />
                    <div className="mb-2 h-3 w-1/2 rounded bg-muted" />
                    <div className="mb-4 h-3 w-2/3 rounded bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 rounded-lg bg-muted" />
                      <div className="h-8 flex-1 rounded-lg bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredModels.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Models Found"
              description="Try adjusting your filters or search query"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(""); setSelectedProvider("all"); }}
                >
                  Reset Filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredModels.map((model, idx) => {
                const isCompared = compareList.includes(model.id);
                return (
                  <div
                    key={model.id}
                    style={{ animationDelay: `${idx * 30}ms` }}
                    className="group relative animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <Card className={cn(
                      "overflow-hidden rounded-2xl border transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 shadow-none",
                      isCompared
                        ? "border-2 border-primary"
                        : "border-border"
                    )}>

                      <CardContent className="p-5">
                        {/* Compare checkbox */}
                        {compareMode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-pressed={isCompared}
                            onClick={() => toggleCompare(model.id)}
                            className={cn(
                              "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border transition-all",
                              isCompared
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {isCompared && <Check className="h-3 w-3" />}
                          </Button>
                        )}

                        {/* Header */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-semibold">{model.name}</h3>
                              {model.quality === "Best" && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                  <Sparkles className="h-2.5 w-2.5" /> BEST
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{model.provider}</p>
                          </div>
                        </div>

                        {/* Tags row */}
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium", speedBg(model.speed), speedColor(model.speed))}>
                            <Gauge className="h-2.5 w-2.5" /> {speedLabel(model.speed)}
                          </span>
                        </div>

                        {/* Pricing */}
                        <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-3">
                          {renderPriceBadge(model.pricing.prompt, "Prompt /1K")}
                          <div className="h-8 w-px bg-border" />
                          {renderPriceBadge(model.pricing.completion, "Output /1K")}
                        </div>

                        {/* Expanded quality info */}
                        {model.quality && (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                            <div className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              model.quality === "Best" ? "bg-amber-400" : model.quality === "Excellent" ? "bg-emerald-400" : "bg-blue-400"
                            )} />
                            {model.quality} quality tier
                            {model.available ? (
                              <span className="ml-auto flex items-center gap-1 text-emerald-400/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Available
                              </span>
                            ) : (
                              <span className="ml-auto flex items-center gap-1 text-rose-400/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Unavailable
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
