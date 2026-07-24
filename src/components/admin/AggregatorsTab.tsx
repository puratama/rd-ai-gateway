"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, RefreshCw, AlertTriangle, Box } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AggregatorItem {
  id: string;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TestResult {
  ok: boolean;
  status: number;
  latency: number;
  modelCount?: number | null;
  error?: string;
}

export default function AggregatorsTab() {
  const [aggregators, setAggregators] = useState<AggregatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AggregatorItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [error, setError] = useState("");

  const fetchAggregators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/aggregators");
      if (res.ok) {
        const data = await res.json();
        setAggregators(data);
      }
    } catch { setError("Failed to load aggregators"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAggregators(); }, [fetchAggregators]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/aggregators?id=${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      fetchAggregators();
    } catch { setError("Failed to delete"); }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/admin/aggregators/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: TestResult = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: data }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, status: 0, latency: 0, error: "Request failed" } }));
    }
    setTestingId(null);
  };


  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Aggregators</h2>
          <p className="text-xs text-muted-foreground">Manage external API aggregator connections.</p>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); setEditing(null); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Aggregator
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : aggregators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No aggregators configured.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Base URL</th>
                  <th className="px-4 py-3 font-medium">API Key</th>
                  <th className="px-4 py-3 text-center font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aggregators.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.baseUrl}</td>
                    <td className="px-4 py-3">
                      <span className={a.hasApiKey ? "text-emerald-400 text-xs" : "text-muted-foreground text-xs"}>
                        {a.hasApiKey ? "••••••••" : "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        a.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", a.isActive ? "bg-emerald-400" : "bg-muted-foreground")} />
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {testResults[a.id] && (
                          <span className={cn("text-[10px] mr-1", testResults[a.id].ok ? "text-emerald-400" : "text-destructive")}>
                            {testResults[a.id].ok ? `${testResults[a.id].latency}ms` : "Fail"}
                          </span>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => handleTestConnection(a.id)} disabled={testingId === a.id} title="Test Connection">
                          <RefreshCw className={cn("h-3.5 w-3.5", testingId === a.id && "animate-spin")} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(a); setShowCreate(true); }}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {testResults[a.id] && (
                        <div className={cn("text-[10px] mt-0.5", testResults[a.id].ok ? "text-emerald-400/70" : "text-destructive/70")}>
                          {testResults[a.id].ok
                            ? (testResults[a.id].modelCount != null ? `${testResults[a.id].modelCount} models` : `HTTP ${testResults[a.id].status}`)
                            : (testResults[a.id].error || `HTTP ${testResults[a.id].status}`)
                          }
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Aggregator" : "Add Aggregator"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update aggregator connection settings." : "Connect an external API aggregator."}
            </DialogDescription>
          </DialogHeader>
          <AggregatorForm
            aggregator={editing}
            onSave={async (data) => {
              if (editing) {
                await fetch("/api/admin/aggregators", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: editing.id, ...data }),
                });
              } else {
                await fetch("/api/admin/aggregators", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });
              }
              setShowCreate(false);
              setEditing(null);
              fetchAggregators();
            }}
            onClose={() => { setShowCreate(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <DialogTitle>Delete Aggregator</DialogTitle>
            </div>
            <DialogDescription>This will permanently remove this aggregator configuration.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AggregatorForm({ aggregator, onSave, onClose }: { aggregator: AggregatorItem | null; onSave: (data: Record<string, unknown>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: aggregator?.name || "", baseUrl: aggregator?.baseUrl || "", apiKey: "", isActive: aggregator?.isActive ?? true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data: Record<string, unknown> = { name: form.name, baseUrl: form.baseUrl, isActive: form.isActive };
    if (form.apiKey) data.apiKey = form.apiKey;
    await onSave(data);
    setSaving(false);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Name</label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., My Aggregator" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Base URL</label>
          <Input value={form.baseUrl} onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.aggregator.com/v1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">API Key</label>
          <Input value={form.apiKey} onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))} placeholder={aggregator ? "Leave blank to keep existing" : "sk-..."} type="password" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="rounded border-input accent-primary" />
          <span className="text-sm text-muted-foreground">Active</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !form.name || !form.baseUrl}>
          {saving ? "Saving..." : aggregator ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}