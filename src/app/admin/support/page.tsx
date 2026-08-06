"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { LifeBuoy } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Message {
  authorRole: "user" | "admin";
  body: string;
  createdAt: number;
}
interface Ticket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: Message[];
  userEmail?: string;
  userName?: string | null;
  createdAt: number;
  updatedAt: number;
}

const statusOptions = ["open", "in_progress", "resolved", "closed"];
const statusColors: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-500",
  in_progress: "bg-blue-500/15 text-blue-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};
const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/15 text-blue-500",
  high: "bg-destructive/15 text-destructive",
};
const filterTabs = ["all", "open", "in_progress", "resolved"] as const;

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function AdminSupportPageContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof filterTabs)[number]>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (!data.tickets?.some((t: Ticket) => t.id === activeId)) setActiveId(null);
      } else {
        setError("Failed to load tickets");
      }
    } catch {
      setError("Failed to load tickets");
    }
    setLoading(false);
  }, [activeId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const activeTicket = tickets.find((t) => t.id === activeId) || null;

  const handleReply = async () => {
    if (!activeId || !reply.trim()) return;
    setSaving(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/admin/support/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to send" }));
        throw new Error(err.error || "Failed to send");
      }
      setReply("");
      await fetchTickets();
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : "Failed to send");
    }
    setSaving(false);
  };

  const handleStatus = async (status: string) => {
    if (!activeId) return;
    const res = await fetch(`/api/admin/support/${activeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchTickets();
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Reply to user support tickets.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
          {filterTabs.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tickets in this view.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                    activeId === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{t.subject}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[t.status] || "")}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{t.userEmail} · {t.category}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.priority} · updated {formatTime(t.updatedAt)}</p>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              {!activeTicket ? (
                <p className="text-sm text-muted-foreground text-center py-16">Select a ticket to view the conversation.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{activeTicket.subject}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityColors[activeTicket.priority] || "")}>
                          {activeTicket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeTicket.userEmail} {activeTicket.userName ? `(${activeTicket.userName})` : ""} · {activeTicket.category}
                      </p>
                    </div>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => handleStatus(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-background px-2 text-xs outline-none"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s === "in_progress" ? "In progress" : s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 max-h-[45vh] overflow-auto pr-1">
                    {activeTicket.messages.map((m, i) => (
                      <div key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.authorRole === "admin" ? "bg-primary/10 ml-auto" : "bg-muted/40")}>
                        <div className={cn("text-[11px] font-medium mb-1", m.authorRole === "admin" ? "text-primary" : "text-muted-foreground")}>
                          {m.authorRole === "admin" ? "Support team" : activeTicket.userEmail} · {formatTime(m.createdAt)}
                        </div>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border">
                    {replyError && <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{replyError}</div>}
                    <textarea
                      value={reply}
                      onChange={(e) => { setReply(e.target.value); setReplyError(""); }}
                      placeholder="Write reply..."
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={handleReply} disabled={!reply.trim() || saving}>{saving ? "Sending..." : "Send Reply"}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatus("resolved")}>Mark Resolved</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatus("closed")}>Close</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminSupportPageContent />
    </Suspense>
  );
}