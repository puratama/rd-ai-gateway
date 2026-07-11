"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Info,
} from "lucide-react";

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
  const [usageLoading, setUsageLoading] = useState(false);

  const internalApiKey = "admin"; // Will use internal auth

  const internalKey = process.env.NEXT_PUBLIC_INTERNAL_KEY || "demo-key-xperimne";

  const fetchKeys = useCallback(async () => {
    startTransition(() => {
      setLoading(true);
    });
    try {
      // Try to fetch from server API first
      const response = await fetch("/api/v1/keys", {
        headers: { Authorization: `Bearer ${internalKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.keys && data.keys.length > 0) {
          setKeys(data.keys);
          setLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback: load from localStorage
    try {
      const { loadApiKeys } = await import("@/lib/api-keys");
      setKeys(loadApiKeys());
    } catch {}
    setLoading(false);
  }, [internalKey]);

  const fetchStats = useCallback(async () => {
    startTransition(() => {
      setUsageLoading(true);
    });
    try {
      const response = await fetch("/api/v1/usage", {
        headers: { Authorization: `Bearer ${internalKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        startTransition(() => {
          setUsageLoading(false);
        });
        return;
      }
    } catch {}

    // Fallback: localStorage
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
    startTransition(() => {
      setUsageLoading(false);
    });
  }, [internalKey]);

  // eslint-disable-next-line -- fetch-on-mount setState in effect is standard React pattern
  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  useEffect(() => {
    if (keys.length > 0) fetchStats();
  }, [keys.length, fetchStats]);

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim()) return;
    try {
      // Create via server API
      const response = await fetch("/api/v1/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalKey}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreated(data.key);
      } else {
        // Fallback: localStorage
        const { createApiKey } = await import("@/lib/api-keys");
        const newKey = createApiKey(newKeyName.trim());
        setNewlyCreated(newKey);
      }

      setNewKeyName("");
      setShowCreate(false);
      fetchKeys();
    } catch {
      setError("Failed to create API key");
    }
  }, [newKeyName, fetchKeys, internalKey]);

  const handleRevoke = useCallback(async (id: string) => {
    try {
      // Revoke via server API
      await fetch(`/api/v1/keys?id=${id}&action=revoke`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${internalKey}` },
      });

      // Also revoke locally
      const { revokeApiKey } = await import("@/lib/api-keys");
      revokeApiKey(id);
      setConfirmDelete(null);
      fetchKeys();
    } catch {
      setError("Failed to revoke API key");
    }
  }, [fetchKeys, internalKey]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      // Delete via server API
      await fetch(`/api/v1/keys?id=${id}&action=delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${internalKey}` },
      });

      // Also delete locally
      const { deleteApiKey } = await import("@/lib/api-keys");
      deleteApiKey(id);
      setConfirmDelete(null);
      fetchKeys();
    } catch {
      setError("Failed to delete API key");
    }
  }, [fetchKeys, internalKey]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

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
            <div className="w-6 h-6 bg-gradient-to-br from-rose-400 to-rose-600 rounded-lg flex items-center justify-center">
              <Key className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">API Keys</span>
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewlyCreated(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Key
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 text-xs text-red-400">
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1">API Keys</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Generate API keys to access the AI Gateway API programmatically.
                Keys are compatible with the OpenAI SDK — just change the base URL.
                Each key tracks usage so you can monitor your spending.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-lg block mb-1">🔑</span>
              <span className="text-[10px] text-zinc-500 block">Active Keys</span>
              <span className="text-sm text-zinc-300 font-semibold">{stats.activeKeys}</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-lg block mb-1">📡</span>
              <span className="text-[10px] text-zinc-500 block">Total Requests</span>
              <span className="text-sm text-zinc-300 font-semibold">{formatTokens(stats.totalRequests)}</span>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-3 text-center">
              <span className="text-lg block mb-1">🎯</span>
              <span className="text-[10px] text-zinc-500 block">Total Tokens</span>
              <span className="text-sm text-zinc-300 font-semibold">{formatTokens(stats.totalTokens)}</span>
            </div>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Create New API Key</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production, Dev, Personal..."
                className="flex-1 h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={!newKeyName.trim()}
                className="px-4 py-2 text-xs bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Newly Created Key - Show once */}
        {newlyCreated && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">Key Created Successfully!</span>
            </div>
            <p className="text-xs text-zinc-400">
              Copy this key now. You won&apos;t be able to see it again!
            </p>
            <div className="flex items-center gap-2 bg-black/50 rounded-lg p-3">
              <code className="flex-1 text-xs text-emerald-300 font-mono break-all">
                {newlyCreated.key}
              </code>
              <button
                onClick={() => copyToClipboard(newlyCreated.key, newlyCreated.id)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              >
                {copiedId === newlyCreated.id
                  ? <Check className="w-4 h-4 text-emerald-400" />
                  : <Copy className="w-4 h-4 text-zinc-400" />
                }
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setNewlyCreated(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Key List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Key className="w-12 h-12 mb-4 text-zinc-700" />
            <h3 className="text-sm font-medium text-zinc-400 mb-1">No API Keys Yet</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Create your first API key to start using the gateway programmatically
            </p>
            <button
              onClick={() => { setShowCreate(true); setNewlyCreated(null); }}
              className="flex items-center gap-2 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create API Key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((apiKey) => (
              <div
                key={apiKey.id}
                className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-colors ${
                  apiKey.isActive ? "border-zinc-800" : "border-red-900/30 opacity-60"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-200">{apiKey.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          apiKey.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {apiKey.isActive ? "Active" : "Revoked"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Created {formatDate(apiKey.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {apiKey.isActive && (
                        <button
                          onClick={() => setConfirmDelete(apiKey.id)}
                          className="p-1.5 hover:bg-red-950/50 rounded-lg transition-colors text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Key display */}
                  <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5 mb-3">
                    <code className="flex-1 text-xs text-zinc-300 font-mono">
                      {showKeyId === apiKey.id
                        ? apiKey.key
                        : `${apiKey.key.slice(0, 12)}${"•".repeat(Math.min(apiKey.key.length - 12, 20))}`
                      }
                    </code>
                    <button
                      onClick={() => setShowKeyId(showKeyId === apiKey.id ? null : apiKey.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {showKeyId === apiKey.id
                        ? <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                        : <Eye className="w-3.5 h-3.5 text-zinc-400" />
                      }
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      {copiedId === apiKey.id
                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                        : <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      }
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Requests</span>
                      <span className="text-xs text-zinc-300 font-semibold">{apiKey.usageCount}</span>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Tokens</span>
                      <span className="text-xs text-zinc-300 font-semibold">{formatTokens(apiKey.totalTokens)}</span>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-2 text-center">
                      <span className="text-[10px] text-zinc-500 block">Last Used</span>
                      <span className="text-xs text-zinc-300 font-semibold">
                        {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : "Never"}
                      </span>
                    </div>
                  </div>

                  {/* Usage code snippet */}
                  <details className="mt-3">
                    <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400 transition-colors">
                      How to use this key
                    </summary>
                    <pre className="mt-2 bg-black/30 rounded-lg p-3 text-[10px] text-zinc-400 font-mono overflow-x-auto">
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
                </div>

                {/* Confirm Delete */}
                {confirmDelete === apiKey.id && (
                  <div className="border-t border-zinc-800 p-3 bg-red-950/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-red-400">Revoke this key?</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRevoke(apiKey.id)}
                        className="px-3 py-1.5 text-[10px] text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* API Documentation Reference */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">API Reference</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-mono">POST</span>
              <span className="text-zinc-300 font-mono">/api/v1/chat/completions</span>
              <span className="text-zinc-500">— Chat completions (OpenAI-compatible)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-400 font-mono">GET</span>
              <span className="text-zinc-300 font-mono">/api/v1/models</span>
              <span className="text-zinc-500">— List available models</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-400 font-mono">GET</span>
              <span className="text-zinc-300 font-mono">/api/v1/usage</span>
              <span className="text-zinc-500">— View usage statistics</span>
            </div>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 mt-3 text-[10px] text-emerald-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View full documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
