"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { Plus, LifeBuoy } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
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

const categories = ["general", "billing", "technical", "account"];
const priorities = ["low", "normal", "high"];

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SupportPageContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "general", priority: "normal", message: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (!data.tickets?.some((t: Ticket) => t.id === activeId)) setActiveId(null);
      } else {
        setError("Failed to load support tickets");
      }
    } catch {
      setError("Failed to load support tickets");
    }
    setLoading(false);
  }, [activeId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const activeTicket = tickets.find((t) => t.id === activeId) || null;

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
      await fetchTickets();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to submit");
    }
    setSaving(false);
  };

  const handleReply = async () => {
    if (!activeId || !reply.trim()) return;
    setReplyError("");
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
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : "Failed to send");
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Support</h1>
            <p className="text-sm text-muted-foreground">Contact our team. We usually respond within a few hours.</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No support tickets yet.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                    activeId === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{t.subject}</span>
                    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", statusColors[t.status] || statusColors.open)}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.category} · {t.priority} · {t.messages.length} {t.messages.length === 1 ? "message" : "messages"} · updated {formatTime(t.updatedAt)}
                  </p>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              {!activeTicket ? (
                <p className="text-sm text-muted-foreground text-center py-16">Select a ticket to read the conversation.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{activeTicket.subject}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", priorityColors[activeTicket.priority] || "")}>
                        {activeTicket.priority}
                      </span>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColors[activeTicket.status] || "")}>
                      {activeTicket.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-auto pr-1">
                    {activeTicket.messages.map((m, i) => (
                      <div key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.authorRole === "admin" ? "bg-primary/10" : "bg-muted/40")}>
                        <div className={cn("text-[11px] font-medium mb-1", m.authorRole === "admin" ? "text-primary" : "text-muted-foreground")}>
                          {m.authorRole === "admin" ? "Support team" : "You"} · {formatTime(m.createdAt)}
                        </div>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))}
                  </div>

                  {activeTicket.status !== "closed" ? (
                    <div className="pt-2 border-t border-border">
                      {replyError && <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{replyError}</div>}
                      <textarea
                        value={reply}
                        onChange={(e) => { setReply(e.target.value); setReplyError(""); }}
                        placeholder="Type your reply..."
                        rows={3}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                      <Button size="sm" className="mt-2" onClick={handleReply} disabled={!reply.trim()}>Send Reply</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">This ticket is closed.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Support Ticket</DialogTitle>
              <DialogDescription>Describe your issue. Our team will reply here.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Subject"
                  className="h-9 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="general">General</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe your issue..."
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
              )}
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Submitting..." : "Submit Ticket"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<AppShell><div className="flex h-full items-center justify-center"><span className="text-sm text-muted-foreground">Loading...</span></div></AppShell>}>
      <SupportPageContent />
    </Suspense>
  );
}