"use client";

import { useState, useEffect } from "react";
import { Grid3X3, Search, RefreshCw, Database, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ModelFromAPI {
  id: string;
  name: string;
  provider: string;
  context?: number;
}

interface ProviderGroup {
  name: string;
  models: string;
}

function groupByProvider(models: ModelFromAPI[]): ProviderGroup[] {
  const map = new Map<string, string[]>();
  for (const m of models) {
    const existing = map.get(m.provider) || [];
    existing.push(m.name);
    map.set(m.provider, existing);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, list]) => ({
      name,
      models: list.slice(0, 5).join(", ") + (list.length > 5 ? ` +${list.length - 5} more` : ""),
    }));
}

const FALLBACK_PROVIDERS: ProviderGroup[] = [
  { name: "OpenAI", models: "GPT-4o, GPT-4o Mini, o3, GPT-5" },
  { name: "Anthropic", models: "Claude Sonnet 4, Claude Haiku 3.5, Claude Opus 4" },
  { name: "Google", models: "Gemini 2.0 Flash, Gemini 2.5 Pro" },
  { name: "DeepSeek", models: "DeepSeek V3, DeepSeek R1" },
  { name: "Meta", models: "Llama 3.3 70B" },
  { name: "Mistral", models: "Mistral Large" },
];

const selectorTips = [
  { icon: Search, title: "Search & Filter", desc: "Open the model dropdown and start typing to filter by name or provider." },
  { icon: RefreshCw, title: "Refresh Model List", desc: "Click refresh to fetch the latest available models from configured providers." },
  { icon: Filter, title: "Context Window", desc: "Each model shows its context window size. Choose larger context for long documents." },
];

const recommendations = [
  { task: "General Chat", models: "GPT-4o, Claude Sonnet", why: "Best balance of speed & quality" },
  { task: "Code Generation", models: "Claude Opus, GPT-5", why: "Superior code reasoning" },
  { task: "Creative Writing", models: "Claude Sonnet, Gemini Pro", why: "Rich, nuanced output" },
  { task: "Analysis & Logic", models: "o3, DeepSeek-R1", why: "Strong reasoning" },
  { task: "Fast & Cheap", models: "GPT-4o Mini, Haiku", why: "Low cost, high speed" },
  { task: "Long Documents", models: "Gemini Pro (1M ctx)", why: "Huge context window" },
];

export default function ModelsPage() {
  const [providers, setProviders] = useState<ProviderGroup[]>(FALLBACK_PROVIDERS);

  useEffect(() => {
    fetch("/api/v1/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          const grouped = groupByProvider(data.data);
          if (grouped.length > 0) setProviders(grouped);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
        <Grid3X3 className="w-3 h-3" />
        Models Catalog
      </div>
      <h1 className="text-3xl font-bold mb-3">Models</h1>
      <p className="text-muted-foreground leading-relaxed mb-10">
        Access <strong className="text-foreground">500+ AI models</strong> from every major provider through the gateway. No separate API keys needed.
      </p>

      <h2 className="text-xl font-semibold mb-4">Available Providers</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        {providers.map((p) => (
          <Card key={p.name}><CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-1">{p.name}</h3>
            <p className="text-xs text-muted-foreground">{p.models}</p>
          </CardContent></Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">Using the Model Selector</h2>
      <div className="space-y-4 mb-10">
        {selectorTips.map((t) => (
          <Card key={t.title}><CardContent className="p-5">
            <div className="flex items-start gap-3">
              <t.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold mb-1">{t.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">Choosing the Right Model</h2>
      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Task</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Recommended</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recommendations.map((r) => (
                <tr key={r.task} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-xs">{r.task}</td>
                  <td className="px-4 py-3 text-primary text-xs">{r.models}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> The model list is fetched from configured providers.
              Availability may vary. Check <span className="text-primary">/pricing</span> for current model pricing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
