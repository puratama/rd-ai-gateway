"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Info,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ApiKeyItem {
  id: string;
  key: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
}

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  activeKeys: number;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreated, setNewlyCreated] = useState<ApiKeyItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<UsageStats | null>(null);

  const internalKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || "demo-key-xperimne";

  const fetchKeys = useCallback(async () => {
    startTransition(() => setLoading(true));
    try {
      const res = await fetch("/api/v1/keys", { headers: { Authorization: `Bearer ${internalKey}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.keys?.length > 0) { setKeys(data.keys); setLoading(false); return; }
      }
    } catch {}
    try {
      const { loadApiKeys } = await import("@/lib/api-keys");
      setKeys(loadApiKeys());
    } catch {}
    setLoading(false);
  }, [internalKey]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/usage", { headers: { Authorization: `Bearer ${internalKey}` } });
      if (res.ok) { setStats(await res.json()); return; }
    } catch {}
    try {
      const { loadUsageRecords, loadApiKeys } = await import("@/lib/api-keys");
      const records = loadUsageRecords();
      const allKeys = loadApiKeys();
      setStats({
        totalRequests: records.length,
        totalTokens: records.reduce((sum: number, r: Record<string, unknown>) => sum + ((r.totalTokens as number) || 0), 0),
        activeKeys: allKeys.filter((k) => k.isActive).length,
      });
    } catch {}
  }, [internalKey]);

  // eslint-disable-next-line -- fetch-on-mount
  useEffect(() => { fetchKeys(); }, [fetchKeys]);
  useEffect(() => { if (keys.length > 0) fetchStats(); }, [keys.length, fetchStats]);

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${internalKey}` },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) { setNewlyCreated((await res.json()).key); }
      else { const { createApiKey } = await import("@/lib/api-keys"); setNewlyCreated(createApiKey(newKeyName.trim())); }
      setNewKeyName(""); setShowCreate(false); fetchKeys();
    } catch { setError("Failed to create API key"); }
  }, [newKeyName, fetchKeys, internalKey]);

  const handleRevoke = useCallback(async (id: string) => {
    try {
      await fetch(`/api/v1/keys?id=${id}&action=revoke`, { method: "DELETE", headers: { Authorization: `Bearer ${internalKey}` } });
      const { revokeApiKey } = await import("@/lib/api-keys"); revokeApiKey(id);
      setConfirmDelete(null); fetchKeys();
    } catch { setError("Failed to revoke API key"); }
  }, [fetchKeys, internalKey]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtT = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();

  return (
    <AppShell variant="user">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">API Keys</h2>
          </div>
          <Button size="sm" onClick={() => { setShowCreate(true); setNewlyCreated(null); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Key
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive flex items-center justify-between">
              {error}
              <Button variant="ghost" size="xs" onClick={() => setError("")}>Dismiss</Button>
            </div>
          )}

          {/* Info */}
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">API Keys</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate API keys to access the AI Gateway programmatically. Compatible with OpenAI SDK — change the base URL. Each key tracks usage automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active Keys", value: stats.activeKeys, icon: Key },
                { label: "Total Requests", value: fmtT(stats.totalRequests), icon: RefreshCw },
                { label: "Total Tokens", value: fmtT(stats.totalTokens), icon: Info },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}>
                    <CardContent className="p-3 text-center">
                      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                      <span className="text-[10px] text-muted-foreground block">{s.label}</span>
                      <span className="text-sm font-semibold">{s.value}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create Form */}
          {showCreate && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Create New API Key</h3>
                <div className="flex gap-2">
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production, Dev, Personal..."
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    autoFocus
                    className="flex-1"
                  />
                  <Button onClick={handleCreate} disabled={!newKeyName.trim()}>Create</Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Newly Created */}
          {newlyCreated && (
            <Card className="border-emerald-500/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-semibold">Key Created Successfully!</span>
                </div>
                <p className="text-xs text-muted-foreground">Copy this key now. You won&apos;t be able to see it again!</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                  <code className="flex-1 text-xs font-mono break-all text-emerald-400">{newlyCreated.key}</code>
                  <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(newlyCreated.key, newlyCreated.id)}>
                    {copiedId === newlyCreated.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setNewlyCreated(null)}>Done</Button>
              </CardContent>
            </Card>
          )}

          {/* Key List */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading keys...</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Key className="w-12 h-12 mb-4 text-muted-foreground/30" />
              <h3 className="text-sm font-medium text-muted-foreground mb-1">No API Keys Yet</h3>
              <p className="text-xs text-muted-foreground mb-4">Create your first API key to start using the gateway</p>
              <Button variant="outline" onClick={() => { setShowCreate(true); setNewlyCreated(null); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((apiKey) => (
                <Card key={apiKey.id} className={cn(!apiKey.isActive && "opacity-50 border-destructive/20")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold">{apiKey.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full", apiKey.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>
                            {apiKey.isActive ? "Active" : "Revoked"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Created {fmt(apiKey.createdAt)}</span>
                        </div>
                      </div>
                      {apiKey.isActive && (
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(apiKey.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Key display */}
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-2.5 mb-3">
                      <code className="flex-1 text-xs font-mono truncate">
                        {showKeyId === apiKey.id ? apiKey.key : `${apiKey.key.slice(0, 12)}${"•".repeat(Math.min(apiKey.key.length - 12, 20))}`}
                      </code>
                      <Button variant="ghost" size="icon-sm" onClick={() => setShowKeyId(showKeyId === apiKey.id ? null : apiKey.id)}>
                        {showKeyId === apiKey.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(apiKey.key, apiKey.id)}>
                        {copiedId === apiKey.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Requests", value: apiKey.usageCount },
                        { label: "Tokens", value: fmtT(apiKey.totalTokens) },
                        { label: "Last Used", value: apiKey.lastUsed ? fmt(apiKey.lastUsed) : "Never" },
                      ].map((s) => (
                        <div key={s.label} className="bg-muted/50 rounded-lg p-2 text-center">
                          <span className="text-[10px] text-muted-foreground block">{s.label}</span>
                          <span className="text-xs font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Code snippet */}
                    <details className="mt-3">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">How to use this key</summary>
                      <pre className="mt-2 bg-muted rounded-lg p-3 text-[10px] text-muted-foreground font-mono overflow-x-auto">
{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1",
  apiKey: "${apiKey.key.slice(0, 12)}...",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`}
                      </pre>
                    </details>
                  </CardContent>

                  {/* Confirm Delete */}
                  {confirmDelete === apiKey.id && (
                    <div className="border-t border-border p-3 bg-destructive/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive">Revoke this key?</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="xs" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                        <Button variant="destructive" size="xs" onClick={() => handleRevoke(apiKey.id)}>Revoke</Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* API Reference */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">API Reference</h3>
              <div className="space-y-2">
                {[
                  { method: "POST", path: "/api/v1/chat/completions", desc: "Chat completions (OpenAI-compatible)" },
                  { method: "GET", path: "/api/v1/models", desc: "List available models" },
                  { method: "GET", path: "/api/v1/usage", desc: "View usage statistics" },
                ].map((ep) => (
                  <div key={ep.path} className="flex items-center gap-2 text-xs">
                    <span className={cn("font-mono", ep.method === "POST" ? "text-emerald-500" : "text-blue-500")}>{ep.method}</span>
                    <span className="font-mono">{ep.path}</span>
                    <span className="text-muted-foreground">— {ep.desc}</span>
                  </div>
                ))}
              </div>
              <Link href="/docs" className="inline-flex items-center gap-1 mt-3 text-[10px] text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> View full documentation
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
