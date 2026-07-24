"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { RefreshCw, Key, Search, Activity, Clock } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KeyItem {
  id: string;
  key: string;
  name: string;
  userId: string;
  email: string;
  userName: string | null;
  role: string;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
  lastUsed: string | null;
  createdAt: string;
}

interface KeysResponse {
  keys: KeyItem[];
  total: number;
  page: number;
  limit: number;
}

const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
const fmtDate = (ts: string | null) => ts ? new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

function AdminKeysPageContent() {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async (term: string, p: number, l: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l) });
      if (term.trim()) params.set("search", term.trim());
      const res = await fetch(`/api/admin/keys?${params}`);
      if (res.ok) {
        const data: KeysResponse = await res.json();
        setKeys(data.keys);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchKeys(search, page, limit), 300);
    return () => window.clearTimeout(timer);
  }, [fetchKeys, search, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">API Keys</h1>
            <p className="text-sm text-muted-foreground">Overview of all user API keys and activity.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchKeys(search, page, limit)} className="cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="pl-9" />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No API keys found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Key Name</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Requests</th>
                    <th className="px-4 py-3 text-right font-medium">Tokens</th>
                    <th className="px-4 py-3 font-medium">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="font-medium">{k.email}</div>
                        <div className="text-xs text-muted-foreground">{k.userName || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          k.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", k.isActive ? "bg-emerald-400" : "bg-destructive")} />
                          {k.isActive ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        <div className="flex items-center justify-end gap-1"><Activity className="h-3 w-3 opacity-40" />{fmtNum(k.usageCount)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtNum(k.totalTokens)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3 opacity-40" />{fmtDate(k.lastUsed)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>{total} total keys</span>
              <div className="flex items-center gap-2">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-7 text-xs">Prev</Button>
                  <Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs">Next</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminKeysPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminKeysPageContent />
    </Suspense>
  );
}
