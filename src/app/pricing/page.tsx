"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  DollarSign,
  ChevronDown,
  ChevronUp,
  BadgeInfo,
  ExternalLink,
} from "lucide-react";
import { pricingData, getProviders, getCategories, formatPrice, getMinPrice, getMaxPrice } from "@/lib/pricing";

export default function PricingPage() {
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "prompt" | "completion" | "context">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);

  const providers = getProviders();
  const categories = getCategories();

  const filteredModels = useMemo(() => {
    let result = [...pricingData];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
      );
    }

    // Filter by provider
    if (selectedProvider !== "all") {
      result = result.filter((m) => m.provider === selectedProvider);
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "prompt":
          cmp = a.pricing.prompt - b.pricing.prompt;
          break;
        case "completion":
          cmp = a.pricing.completion - b.pricing.completion;
          break;
        case "context":
          cmp = a.context - b.context;
          break;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, selectedProvider, selectedCategory, sortBy, sortOrder]);

  const toggleCompare = (modelId: string) => {
    setCompareList((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : prev.length < 4
          ? [...prev, modelId]
          : prev
    );
  };

  const toggleSort = (field: "name" | "prompt" | "completion" | "context") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getCategoryIcon = (cat: string) => categories.find((c) => c.key === cat)?.icon || "❓";
  const getCategoryLabel = (cat: string) => categories.find((c) => c.key === cat)?.label || cat;

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "fast": return "⚡";
      case "balanced": return "⚖️";
      case "slow": return "🐢";
      default: return "❓";
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "fast": return "text-emerald-400";
      case "balanced": return "text-amber-400";
      case "slow": return "text-red-400";
      default: return "text-zinc-400";
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "Best": return "text-yellow-400";
      case "Excellent": return "text-emerald-400";
      case "Good": return "text-blue-400";
      case "Average": return "text-zinc-400";
      default: return "text-zinc-400";
    }
  };

  const formatContext = (ctx: number) => {
    if (ctx === 0) return "-";
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M`;
    if (ctx >= 1000) return `${(ctx / 1000).toFixed(0)}K`;
    return String(ctx);
  };

  // Get unique providers with their model counts
  const providerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pricingData.forEach((m) => {
      counts[m.provider] = (counts[m.provider] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">Pricing</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              compareMode
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <BadgeInfo className="w-3.5 h-3.5" />
            Compare
          </button>
          <Link
            href="/docs/models"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Docs
          </Link>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
              <BadgeInfo className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                Powered by Puter.com — User-Pays Model
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                AI Gateway menggunakan <strong className="text-zinc-400">Puter.js</strong> yang menerapkan
                model <strong className="text-zinc-400">User-Pays</strong> — biaya penggunaan AI
                ditanggung oleh pengguna akhir melalui akun Puter mereka, bukan oleh developer.
                Harga di bawah adalah harga pasar referensi dari penyedia asli.{" "}
                <Link href="/docs" className="text-emerald-400 hover:underline">
                  Pelajari lebih lanjut →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search models by name, ID, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
          >
            <option value="all">All Providers ({pricingData.length})</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p} ({providerCounts[p] || 0})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills (quick filter) */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              selectedCategory === "all"
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedCategory === cat.key
                  ? "bg-zinc-700 text-zinc-200"
                  : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Compare Mode Bar */}
        {compareMode && compareList.length > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-emerald-400">
              {compareList.length} model{compareList.length > 1 ? "s" : ""} selected
              {compareList.length < 2 ? " — select at least 2 to compare" : ""}
            </span>
            {compareList.length >= 2 && (
              <button
                onClick={() => {
                  // Show compare modal
                  setExpandedModel("compare");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
              >
                <BadgeInfo className="w-3 h-3" />
                Compare Now
              </button>
            )}
          </div>
        )}

        {/* Compare Table */}
        {expandedModel === "compare" && compareList.length >= 2 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">Model Comparison</h3>
              <button
                onClick={() => setExpandedModel(null)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium">Feature</th>
                    {compareList.map((id) => {
                      const model = pricingData.find((m) => m.id === id);
                      return (
                        <th key={id} className="text-left px-4 py-3 text-zinc-300 text-xs font-semibold">
                          {model?.name || id}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {[
                    { label: "Provider", key: "provider" as const },
                    { label: "Category", key: "category" as const },
                    { label: "Context", key: "context" as const, format: (v: number) => formatContext(v) },
                    { label: "Speed", key: "speed" as const },
                    { label: "Quality", key: "quality" as const },
                    { label: "Prompt Price", key: "pricing" as const, subKey: "prompt" as const, format: (v: number) => `$${v}/1M tokens` },
                    { label: "Completion Price", key: "pricing" as const, subKey: "completion" as const, format: (v: number) => `$${v}/1M tokens` },
                  ].map((row) => (
                    <tr key={row.label} className="hover:bg-zinc-800/20">
                      <td className="px-4 py-3 text-zinc-400 text-xs">{row.label}</td>
                      {compareList.map((id) => {
                        const model = pricingData.find((m) => m.id === id);
                        if (!model) return <td key={id} className="px-4 py-3 text-zinc-600 text-xs">-</td>;
                        let value: string | number | undefined;
                        if (row.key === "pricing" && row.subKey) {
                          value = model.pricing[row.subKey as keyof typeof model.pricing];
                        } else {
                          value = model[row.key as keyof typeof model];
                        }
                        if (row.key === "category") value = getCategoryLabel(value as string);
                        if (row.key === "speed") value = `${getSpeedIcon(value as string)} ${value}`;
                        const formatted = row.format ? row.format(value as number) : String(value);
                        return (
                          <td key={id} className="px-4 py-3 text-zinc-200 text-xs">{formatted}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Showing {filteredModels.length} of {pricingData.length} models
          </p>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Sort by:</span>
            {(["name", "prompt", "completion", "context"] as const).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                  sortBy === field
                    ? "bg-zinc-800 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {field === "name" ? "Name" : field === "prompt" ? "Prompt $" : field === "completion" ? "Completion $" : "Context"}
                {sortBy === field && (
                  sortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Table */}
        {filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Search className="w-12 h-12 mb-4 text-zinc-700" />
            <h3 className="text-sm font-medium text-zinc-400 mb-1">No Models Found</h3>
            <p className="text-xs text-zinc-500">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    {compareMode && (
                      <th className="w-10 px-2 py-3"></th>
                    )}
                    <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium">Model</th>
                    <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium">Provider</th>
                    <th className="text-left px-4 py-3 text-zinc-400 text-xs font-medium">Category</th>
                    <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium">Context</th>
                    <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium">Speed</th>
                    <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium">Prompt $/1M</th>
                    <th className="text-right px-4 py-3 text-zinc-400 text-xs font-medium">Completion $/1M</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredModels.map((model) => (
                    <tr
                      key={model.id}
                      className={`hover:bg-zinc-800/20 transition-colors cursor-pointer ${
                        expandedModel === model.id ? "bg-zinc-800/30" : ""
                      }`}
                      onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
                    >
                      {compareMode && (
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={compareList.includes(model.id)}
                            onChange={() => toggleCompare(model.id)}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-200 font-medium">{model.name}</span>
                          {model.quality === "Best" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">BEST</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400">{model.provider}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          {getCategoryIcon(model.category)} {getCategoryLabel(model.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-400">{formatContext(model.context)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs ${getSpeedColor(model.speed)}`}>
                          {getSpeedIcon(model.speed)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-300 font-mono">{formatPrice(model.pricing.prompt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-300 font-mono">{formatPrice(model.pricing.completion)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Price Range Summary */}
        {!search && selectedProvider === "all" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStatCard
              icon="💰"
              label="Cheapest Prompt"
              value={`${formatPrice(getMinPrice(pricingData))}/1M`}
            />
            <MiniStatCard
              icon="💎"
              label="Most Expensive"
              value={`${formatPrice(getMaxPrice(pricingData))}/1M`}
            />
            <MiniStatCard
              icon="🏢"
              label="Providers"
              value={String(providers.length)}
            />
            <MiniStatCard
              icon="📊"
              label="Total Models"
              value={String(pricingData.length)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 text-center">
      <span className="text-lg mb-1 block">{icon}</span>
      <span className="text-[10px] text-zinc-500 block">{label}</span>
      <span className="text-xs text-zinc-300 font-semibold">{value}</span>
    </div>
  );
}
