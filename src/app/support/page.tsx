"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  LifeBuoy,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Ticket as TicketIcon,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";

interface Message {
  authorRole: "user" | "admin";
  body: string;
  createdAt: number;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "closed";

const statusColors: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-500",
  in_progress: "bg-blue-500/15 text-blue-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-muted text-muted-foreground",
};

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

const categories = ["general", "billing", "technical", "account"];
const priorities = ["low", "normal", "high"];

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  technical: "Technical",
  account: "Account",
};

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const categoryLabel = (category: string) => CATEGORY_LABELS[category] ?? titleCase(category);

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColors[status] || statusColors.open)}>
      {titleCase(status)}
    </span>
  );
}

function TicketListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex justify-end"><Skeleton className="h-11 w-3/5" /></div>
          <div className="flex justify-start"><Skeleton className="h-11 w-2/3" /></div>
          <div className="flex justify-end"><Skeleton className="h-11 w-1/2" /></div>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="mt-2 h-8 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function SupportPageContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "general", priority: "normal", message: "" });
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error("Failed to load support tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setError("Failed to load support tickets");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(
    () => (filter === "all" ? tickets : tickets.filter((t) => t.status === filter)),
    [tickets, filter]
  );

  // Clear selection when the active ticket disappears (filter change / refresh)
  useEffect(() => {
    if (activeId && !filteredTickets.some((t) => t.id === activeId)) setActiveId(null);
  }, [filteredTickets, activeId]);

  const activeTicket = tickets.find((t) => t.id === activeId) || null;

  const stats = useMemo(() => {
    const active = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { total: tickets.length, active, resolved };
  }, [tickets]);

  const openCreate = () => {
    setForm({ subject: "", category: "general", priority: "normal", message: "" });
    setFormError("");
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setFormError("Subject and message are required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to submit" }));
        throw new Error(err.error || "Failed to submit");
      }
      setOpen(false);
      setFilter("all");
      await fetchTickets();
      toast.success("Ticket submitted successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    }
    setSaving(false);
  };

  const handleReply = async () => {
    if (!activeId || !reply.trim()) return;
    try {
      const res = await fetch(`/api/support/${activeId}`, {
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
  };

  return (
    <AppShell variant="user">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <LifeBuoy className="h-4 w-4 text-primary" /> Support
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Support Center</h1>
              <p className="text-sm text-muted-foreground">Contact our team. We usually respond within a few hours.</p>
            </div>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Ticket
            </Button>
          </header>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TicketIcon className="h-4 w-4 text-blue-500" /> Total tickets
                </div>
                <div className="mt-3 text-3xl font-semibold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-500" /> Active
                </div>
                <div className="mt-3 text-3xl font-semibold">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Resolved
                </div>
                <div className="mt-3 text-3xl font-semibold">{stats.resolved}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              items={STATUS_OPTIONS.map((opt) => ({ ...opt, value: opt.key, disabled: loading }))}
              value={filter}
              onValueChange={(value) => setFilter(value as StatusFilter)}
              ariaLabel="Ticket status"
            />
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Last updated {tickets.length ? formatTime(Math.max(...tickets.map((t) => t.updatedAt))) : "—"}
              </p>
              <Button variant="outline" size="sm" onClick={() => void fetchTickets()} disabled={loading} className="cursor-pointer">
                <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>

          {loading && tickets.length === 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <TicketListSkeleton />
              <ConversationSkeleton />
            </div>
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={tickets.length === 0 ? "Belum ada tiket" : "Tidak ada tiket"}
              description={
                tickets.length === 0
                  ? "Buat tiket pertama kamu untuk mulai dibantu tim kami."
                  : "Tidak ada tiket yang cocok dengan filter ini."
              }
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <div className="space-y-2">
                {filteredTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-colors cursor-pointer",
                      activeId === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.subject}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {categoryLabel(t.category)} <span className="mx-2">·</span> {titleCase(t.priority)} Priority
                      <span className="mx-2">·</span> {t.messages.length} {t.messages.length === 1 ? "message" : "messages"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">updated {formatTime(t.updatedAt)}</p>
                  </button>
                ))}
              </div>

              <Card className="h-fit">
                <CardContent className="p-5">
                  {!activeTicket ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                      <MessageSquare className="h-10 w-10 opacity-30" />
                      <p className="mt-3 text-sm">Select a ticket to read the conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{activeTicket.subject}</span>
                            <StatusBadge status={activeTicket.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {categoryLabel(activeTicket.category)} <span className="mx-2">·</span> {titleCase(activeTicket.priority)} Priority
                            <span className="mx-2">·</span> Created {formatTime(activeTicket.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                        {activeTicket.messages.map((m, i) => (
                          <div key={i} className={cn("max-w-[85%] w-fit wrap-break-word rounded-xl border px-3 py-2 text-sm", m.authorRole === "admin" ? "border-border/70 bg-muted/60" : "border-primary/25 bg-primary/15 ml-auto")}>
                            <div className={cn("mb-1 text-[11px] font-medium", m.authorRole === "admin" ? "text-muted-foreground" : "text-primary")}>
                              {m.authorRole === "admin" ? "Support team" : "You"} <span className="mx-2">·</span> {formatTime(m.createdAt)}
                            </div>
                            <p className="whitespace-pre-wrap">{m.body}</p>
                          </div>
                        ))}
                      </div>

                      {activeTicket.status !== "closed" ? (
                        <div className="border-t border-border pt-4">
                          <Textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Type your reply..."
                            rows={3}
                            className="bg-background"
                          />
                          <Button size="sm" className="mt-2 cursor-pointer" onClick={handleReply} disabled={!reply.trim()}>
                            <Send className="mr-1.5 h-3.5 w-3.5" /> Send Reply
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">This ticket is closed.</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue. Our team will reply here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Short summary of your issue"
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ticket-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v || "general" }))}>
                  <SelectTrigger id="ticket-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ticket-priority">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v || "normal" }))}>
                  <SelectTrigger id="ticket-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="ticket-message">Message</Label>
              <Textarea
                id="ticket-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue..."
                rows={4}
                className="bg-background"
              />
            </div>
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Submitting..." : "Submit Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<AppShell variant="user"><div className="flex h-full items-center justify-center"><span className="text-sm text-muted-foreground">Loading...</span></div></AppShell>}>
      <SupportPageContent />
    </Suspense>
  );
}
