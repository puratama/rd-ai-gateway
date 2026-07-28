"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Sparkles, RefreshCw, Search } from "lucide-react";
import { getModels, clearModelsCache } from "@/lib/api-client";
import type { ModelInfo } from "@/types";

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onSelect }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function loadModels() {
    setLoading(true);
    const result = await getModels();
    if (result.length > 0) {
      setModels(result);
      if (!selectedModel) {
        onSelect(result[0].id);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadModels();
    // ponytail: mount-only model bootstrap; re-run via explicit refresh button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    clearModelsCache();
    const result = await getModels();
    setModels(result);
    setTimeout(() => setRefreshing(false), 500);
  }

  // Group by provider
  const grouped = models.reduce((acc, m) => {
    const provider = m.provider || "Other";
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(m);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  const filtered = search
    ? Object.entries(grouped).reduce((acc, [provider, modelList]) => {
        const filteredModels = modelList.filter(
          (m) =>
            m.id.toLowerCase().includes(search.toLowerCase()) ||
            m.name.toLowerCase().includes(search.toLowerCase())
        );
        if (filteredModels.length > 0) acc[provider] = filteredModels;
        return acc;
      }, {} as Record<string, ModelInfo[]>)
    : grouped;

  const selectedModelName = models.find((m) => m.id === selectedModel)?.name || selectedModel;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors border border-zinc-700 cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span className="max-w-[200px] truncate">
          {loading ? "Loading..." : selectedModelName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[320px] max-h-[420px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 flex flex-col">
          {/* Search & Refresh */}
          <div className="p-2 border-b border-zinc-800 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none flex-1"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Model list */}
          <div className="flex-1 overflow-y-auto p-1">
            {Object.entries(filtered).map(([provider, modelList]) => (
              <div key={provider}>
                <div className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {provider}
                </div>
                {modelList.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelect(model.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      model.id === selectedModel
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="font-medium">{model.name || model.id}</div>
                    {model.context && (
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {(model.context / 1000).toFixed(0)}K context
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(filtered).length === 0 && (
              <div className="p-4 text-center text-sm text-zinc-500">
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
