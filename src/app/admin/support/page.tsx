"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { LifeBuoy, Clock, Inbox } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const statusColors: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-500",
  in_progress: "bg-blue-500/15 text-blue-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};
const filterTabs = ["all", "open", "in_progress", "resolved"] as const;

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const stats = [
    { label: "Total", value: tickets.length, badge: "text-foreground" },
    { label: "Open", value: tickets.filter((t) => t.status === "open").length, badge: "text-amber-500" },
    { label: "In Progress", value: tickets.filter((t) => t.status === "in_progress").length, badge: "text-blue-500" },
    { label: "Resolved", value: tickets.filter((t) => t.status === "resolved").length, badge: "text-emerald-500" },
  ];

  const handleReply = async () => {
    if (!activeId || !reply.trim()) return;
    setSaving(true);
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
      toast.success("Reply sent");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
    setSaving(false);
  };

  const handleStatus = async (status: string) => {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/admin/support/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchTickets();
      toast.success(`Status set to ${titleCase(status)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <LifeBuoy className="h-3.5 w-3.5" /> Admin
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Support Tickets</h1>
            <p className="text-sm text-muted-foreground">Reply to user support tickets and manage their lifecycle.</p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Last updated {tickets.length ? formatTime(Math.max(...tickets.map((t) => t.updatedAt))) : "—"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-2xl font-semibold", s.badge)}>{s.value}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Filters */}
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
              {f === "all" ? "All" : titleCase(f)}
            </button>
          ))}
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {tickets.length === 0 ? "No support tickets yet." : "No tickets match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-6">
            {/* Ticket list */}
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
                      {titleCase(t.status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {t.userEmail} <span className="mx-2">·</span> {titleCase(t.category)} <span className="mx-2">·</span> {titleCase(t.priority)} Priority
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">updated {formatTime(t.updatedAt)}</p>
                </button>
              ))}
            </div>

            {/* Conversation panel */}
            <div className="rounded-xl border border-border bg-card p-4">
              {!activeTicket ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-sm text-muted-foreground">Select a ticket to view the conversation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{activeTicket.subject}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[activeTicket.status] || "")}>
                          {titleCase(activeTicket.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activeTicket.userEmail} <span className="mx-2">·</span> {titleCase(activeTicket.category)} <span className="mx-2">·</span> {titleCase(activeTicket.priority)} Priority
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[45vh] overflow-auto pr-1">
                    {activeTicket.messages.map((m, i) => (
                      <div key={i} className={cn("max-w-[85%] w-fit break-words rounded-xl border px-3 py-2 text-sm", m.authorRole === "admin" ? "border-primary/25 bg-primary/15 ml-auto" : "border-border/70 bg-muted/60")}>
                        <div className={cn("mb-1 text-[11px] font-medium", m.authorRole === "admin" ? "text-primary" : "text-muted-foreground")}>
                          {m.authorRole === "admin" ? "Support team" : activeTicket.userEmail} <span className="mx-2">·</span> {formatTime(m.createdAt)}
                        </div>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>

                  {activeTicket.status !== "closed" && (
                    <div className="border-t border-border pt-4">
                      <textarea
                        value={reply}
                        onChange={(e) => { setReply(e.target.value); }}
                        placeholder="Write reply..."
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" onClick={handleReply} disabled={!reply.trim() || saving}>{saving ? "Sending..." : "Send Reply"}</Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatus("resolved")}>Mark Resolved</Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatus("closed")}>Mark Closed</Button>
                      </div>
                    </div>
                  )}
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
