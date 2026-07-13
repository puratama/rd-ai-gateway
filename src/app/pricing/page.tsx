"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BadgeInfo,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  Search,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fetchPricingFromDB } from "@/lib/pricing-db";
import type { ModelPricing } from "@/types";

function getProviders(models: ModelPricing[]) { return Array.from(new Set(models.map((m) => m.provider))); }
function getCategories(models: ModelPricing[]) {
  return [
    { key: "chat", icon: "💬", label: "Chat" },
    { key: "reasoning", icon: "🧠", label: "Reasoning" },
    { key: "coding", icon: "💻", label: "Coding" },
    { key: "fast", icon: "⚡", label: "Fast" },
    { key: "image", icon: "🖼️", label: "Image" },
    { key: "vision", icon: "👁️", label: "Vision" },
    { key: "open-source", icon: "🌐", label: "Open Source" },
  ].filter((c) => models.some((m) => m.category === c.key));
}
function formatPrice(n: number) { return n === 0 ? "Free" : n.toFixed(2); }
function getMinPrice(models: ModelPricing[]) { return models.reduce((min, m) => Math.min(min, m.pricing.prompt), Infinity); }
function getMaxPrice(models: ModelPricing[]) { return models.reduce((max, m) => Math.max(max, m.pricing.prompt), 0); }

export default function PricingPage() {
  const [pricingData, setPricingData] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "prompt" | "completion" | "context">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    fetchPricingFromDB().then((data) => { setPricingData(data); setLoading(false); });
  }, []);

  const providers = useMemo(() => getProviders(pricingData), [pricingData]);
  const categories = useMemo(() => getCategories(pricingData), [pricingData]);

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
    if (selectedCategory !== "all") result = result.filter((m) => m.category === selectedCategory);
    result.sort((a, b) => {
      const cmp = sortBy === "name"
        ? a.name.localeCompare(b.name)
        : sortBy === "prompt"
          ? a.pricing.prompt - b.pricing.prompt
          : sortBy === "completion"
            ? a.pricing.completion - b.pricing.completion
            : a.context - b.context;
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return result;
  }, [search, selectedProvider, selectedCategory, sortBy, sortOrder]);

  const toggleCompare = (modelId: string) => {
    setCompareList((prev) => prev.includes(modelId) ? prev.filter((id) => id !== modelId) : prev.length < 4 ? [...prev, modelId] : prev);
  };

  const toggleSort = (field: "name" | "prompt" | "completion" | "context") => {
    if (sortBy === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const getCategoryIcon = (cat: string) => categories.find((c) => c.key === cat)?.icon || "❓";
  const getCategoryLabel = (cat: string) => categories.find((c) => c.key === cat)?.label || cat;
  const formatContext = (ctx: number) => ctx === 0 ? "-" : ctx >= 1000000 ? `${(ctx / 1000000).toFixed(0)}M` : ctx >= 1000 ? `${(ctx / 1000).toFixed(0)}K` : String(ctx);
  const speedIcon = (speed: string) => speed === "fast" ? "⚡" : speed === "balanced" ? "⚖️" : speed === "slow" ? "🐢" : "❓";
  const speedClass = (speed: string) => speed === "fast" ? "text-emerald-500" : speed === "balanced" ? "text-amber-500" : speed === "slow" ? "text-destructive" : "text-muted-foreground";

  return (
    <AppShell variant="user">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Model Pricing</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={compareMode ? "default" : "outline"} size="sm" onClick={() => setCompareMode(!compareMode)}>
              <BadgeInfo className="w-3.5 h-3.5 mr-1.5" /> Compare
            </Button>
            <Link href="/docs/models" className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Docs
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info */}
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <BadgeInfo className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Transparent model pricing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compare model costs, context windows, speed, and quality before choosing a plan or package.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search models by name, ID, or provider..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)} className="h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Providers ({pricingData.length})</option>
              {providers.map((p) => <option key={p} value={p}>{p} ({providerCounts[p] || 0})</option>)}
            </select>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>All</Button>
            {categories.map((cat) => (
              <Button key={cat.key} variant={selectedCategory === cat.key ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.key)}>
                {cat.icon} {cat.label}
              </Button>
            ))}
          </div>

          {/* Compare bar */}
          {compareMode && compareList.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-xs text-primary">{compareList.length} model{compareList.length > 1 ? "s" : ""} selected{compareList.length < 2 ? " — select at least 2 to compare" : ""}</span>
                {compareList.length >= 2 && <Button size="sm" onClick={() => setExpandedModel("compare")}>Compare Now</Button>}
              </CardContent>
            </Card>
          )}

          {/* Compare table */}
          {expandedModel === "compare" && compareList.length >= 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Model Comparison</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setExpandedModel(null)}>Close</Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      {compareList.map((id) => <TableHead key={id}>{pricingData.find((m) => m.id === id)?.name || id}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["provider", "category", "context", "speed", "quality"].map((key) => (
                      <TableRow key={key}>
                        <TableCell className="text-muted-foreground capitalize">{key}</TableCell>
                        {compareList.map((id) => {
                          const model = pricingData.find((m) => m.id === id);
                          const value = !model ? "-" : key === "category" ? getCategoryLabel(model.category) : key === "context" ? formatContext(model.context) : key === "speed" ? `${speedIcon(model.speed)} ${model.speed}` : String(model[key as keyof typeof model] ?? "");
                          return <TableCell key={id}>{value}</TableCell>;
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sort controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">Showing {filteredModels.length} of {pricingData.length} models</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Sort by:</span>
              {(["name", "prompt", "completion", "context"] as const).map((field) => (
                <Button key={field} variant={sortBy === field ? "secondary" : "ghost"} size="sm" onClick={() => toggleSort(field)} className="h-7 text-[10px]">
                  {field === "name" ? "Name" : field === "prompt" ? "Prompt $" : field === "completion" ? "Completion $" : "Context"}
                  {sortBy === field && (sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}
                </Button>
              ))}
            </div>
          </div>

          {/* Model table */}
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-sm font-medium mb-1">No Models Found</h3>
              <p className="text-xs">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {compareMode && <TableHead className="w-10" />}
                      <TableHead>Model</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Context</TableHead>
                      <TableHead className="text-right">Speed</TableHead>
                      <TableHead className="text-right">Prompt $/1M</TableHead>
                      <TableHead className="text-right">Completion $/1M</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModels.map((model) => (
                      <TableRow key={model.id} className={cn("cursor-pointer", expandedModel === model.id && "bg-muted/50")} onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}>
                        {compareMode && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={compareList.includes(model.id)} onChange={() => toggleCompare(model.id)} className="w-4 h-4 rounded border-input bg-background accent-primary" />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{model.name}</span>
                            {model.quality === "Best" && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded">BEST</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{model.provider}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{getCategoryIcon(model.category)} {getCategoryLabel(model.category)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{formatContext(model.context)}</TableCell>
                        <TableCell className="text-right"><span className={cn("text-xs", speedClass(model.speed))}>{speedIcon(model.speed)}</span></TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatPrice(model.pricing.prompt)}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatPrice(model.pricing.completion)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Stats footer */}
          {!search && selectedProvider === "all" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4 text-center"><span className="text-[10px] text-muted-foreground block">Cheapest Prompt</span><span className="text-sm font-semibold">{formatPrice(getMinPrice(pricingData))}/1M</span></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><span className="text-[10px] text-muted-foreground block">Most Expensive</span><span className="text-sm font-semibold">{formatPrice(getMaxPrice(pricingData))}/1M</span></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><span className="text-[10px] text-muted-foreground block">Providers</span><span className="text-sm font-semibold">{providers.length}</span></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><span className="text-[10px] text-muted-foreground block">Total Models</span><span className="text-sm font-semibold">{pricingData.length}</span></CardContent></Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
