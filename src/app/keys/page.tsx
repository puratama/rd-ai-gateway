"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Key, Plus, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle, RefreshCw,
  Sparkles, Terminal, Clock, Activity, ChevronDown, Globe, Edit3,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ApiKeyItem {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
}

const fmtT = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();
const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  const fetchKeys = useCallback(async () => {
    startTransition(() => setLoading(true));
    try {
      const res = await fetch("/api/user/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      setError("Failed to load API keys");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = useCallback(async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        await fetchKeys();
        toast.success("API key created");
      } else {
        toast.error("Failed to create key");
      }
    } catch {
      toast.error("Failed to create API key");
    }
    setNewKeyName("");
    setShowCreate(false);
  }, [newKeyName, fetchKeys]);

  const handleRegenerate = useCallback(async (id: string, name: string) => {
    try {
      const res = await fetch("/api/user/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateId: id, name }),
      });
      if (res.ok) {
        await fetchKeys();
        toast.success("API key regenerated");
      } else {
        toast.error("Failed to regenerate key");
      }
    } catch {
      toast.error("Failed to regenerate API key");
    }
  }, [fetchKeys]);

  const handleUpdate = useCallback(async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/user/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        await fetchKeys();
        toast.success("API key updated");
      } else {
        toast.error("Failed to update key");
      }
    } catch {
      toast.error("Failed to update API key");
    }
    setEditingId(null);
  }, [fetchKeys]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/user/keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        await fetchKeys();
        toast.success("API key deleted");
      } else {
        toast.error("Failed to delete key");
      }
    } catch {
      toast.error("Failed to delete API key");
    }
  }, [fetchKeys]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          {/* Header */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4 text-primary" /> API Keys
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
              <p className="text-sm text-muted-foreground">Manage your personal API keys for the AI Gateway.</p>
            </div>
            <Button size="sm" onClick={() => { setShowCreate(true); setNewKeyName(""); }} className="cursor-pointer">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Key
            </Button>
          </header>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive flex items-center justify-between">
              {error}
              <Button variant="ghost" size="xs" onClick={() => setError("")}>Dismiss</Button>
            </div>
          )}

          {/* Base URL */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Base URL</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Use this base URL with any OpenAI-compatible SDK:</p>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/30 p-3">
                    <code className="flex-1 font-mono text-xs text-primary" suppressHydrationWarning>{baseUrl}/api/v1</code>
                    <Button variant="ghost" size="icon-sm" onClick={() => copyToClipboard(`${baseUrl}/api/v1`, "baseurl")}>
                      {copiedId === "baseurl" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keys Table */}
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : keys.length === 0 ? (
            <EmptyState
              icon={Key}
              title="No API Keys Yet"
              description="Create your first API key to start using the gateway"
              action={
                <Button size="sm" onClick={() => { setShowCreate(true); setNewKeyName(""); }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create API Key
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 text-center font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Usage</th>
                      <th className="px-4 py-3 text-right font-medium">Tokens</th>
                      <th className="px-4 py-3 font-medium">Last Used</th>
                      <th className="w-28 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          {editingId === key.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdate(key.id, { name: editName });
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-8 text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium">{key.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-muted-foreground">
                              {showKey === key.id ? key.key : `${key.key.slice(0, 12)}...`}
                            </code>
                            <Button variant="ghost" size="icon-xs" onClick={() => setShowKey(showKey === key.id ? null : key.id)}>
                              {showKey === key.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => copyToClipboard(key.key, key.id)}>
                              {copiedId === key.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            key.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", key.isActive ? "bg-emerald-400" : "bg-muted-foreground")} />
                            {key.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmtT(key.usageCount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmtT(key.totalTokens)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{key.lastUsed ? fmtDate(key.lastUsed) : "\u2014"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            {editingId === key.id ? (
                              <>
                                <Button variant="ghost" size="icon-xs" onClick={() => handleUpdate(key.id, { name: editName })}>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                </Button>
                                <Button variant="ghost" size="icon-xs" onClick={() => setEditingId(null)}>
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon-xs"
                                  onClick={() => { setEditingId(key.id); setEditName(key.name); }}
                                  title="Edit name">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-xs"
                                  onClick={() => handleRegenerate(key.id, key.name)}
                                  title="Regenerate">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-xs"
                                  className="text-muted-foreground/50 hover:text-destructive"
                                  onClick={() => setConfirmDelete(key.id)}
                                  title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick-config code snippet */}
          {keys.some((k) => k.isActive) && (
            <details className="group rounded-xl border border-border bg-card p-4">
              <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> Quick Start &mdash; Copy &amp; Paste
                <ChevronDown className="ml-auto h-3 w-3 transition-transform group-open:rotate-180" />
              </summary>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-muted/30 p-4 font-mono text-[10px] leading-relaxed text-muted-foreground" suppressHydrationWarning>
{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}/api/v1",
  apiKey: "${keys.find((k) => k.isActive)?.key.slice(0, 12) || "xpgw_"}...",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});`}
              </pre>
            </details>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) setShowCreate(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </div>
              <DialogTitle>Create API Key</DialogTitle>
            </div>
            <DialogDescription>Create a new personal API key.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1.5 block text-xs font-medium">Key Name</label>
            <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production Key" onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <DialogTitle>Delete API Key</DialogTitle>
            </div>
            <DialogDescription>This permanently deletes this key. Services using it will stop working.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (confirmDelete) handleDelete(confirmDelete); }}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
