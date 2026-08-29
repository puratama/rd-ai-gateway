"use client";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Megaphone,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import { formatDate as formatDateValue } from "@/components/ui/format-date";

interface Announcement {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

function AdminAnnouncementsPageContent() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<{ id?: string; title: string; description: string; isActive: boolean }>({ title: "", description: "", isActive: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch {
      setError("Failed to load announcements");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openCreate = () => {
    setForm({ title: "", description: "", isActive: true });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setForm({ id: a.id, title: a.title, description: a.description, isActive: a.isActive });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Title and description are required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const isNew = !form.id;
      const res = await fetch("/api/admin/announcements", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? { title: form.title, description: form.description } : { id: form.id, title: form.title, description: form.description, isActive: form.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(getApiErrorMessage(err, "Save failed"));
      }
      setModalOpen(false);
      fetchAnnouncements();
      toast.success(isNew ? "Announcement created" : "Announcement updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(getApiErrorMessage(err, "Delete failed"));
      }
      setDeletingId(null);
      fetchAnnouncements();
      toast.success("Announcement deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const formatDate = (ts: number) => formatDateValue(ts);

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Announcements</h1>
            <p className="text-sm text-muted-foreground">Manage announcements shown on guest and client pages.</p>
          </div>
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet."
            description="Buat announcement pertama untuk menampilkan bar di atas navbar."
            action={
              <Button onClick={openCreate} className="gap-1.5">
                <Plus className="w-4 h-4" /> New Announcement
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader className="bg-muted/50 text-left text-muted-foreground">
                  <TableRow>
                    <TableHead className="px-4 py-3 font-medium">Title</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Description</TableHead>
                    <TableHead className="px-4 py-3 text-center font-medium">Status</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Created</TableHead>
                    <TableHead className="w-24 px-4 py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {announcements.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-4 py-3 font-medium">{a.title}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground max-w-xs truncate">{a.description}</TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          a.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {a.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(a)} aria-label="Edit announcement" title="Edit announcement">
                            <Edit3 className="w-4 h-4" />

                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeletingId(a.id)} aria-label="Delete announcement" title="Delete announcement">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">{form.id ? "Edit Announcement" : "New Announcement"}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {form.id ? "Update announcement details." : "Announcement appears as a bar above the navbar."}
                </DialogDescription>
              </div>
            </DialogHeader>
            <DialogBody className="space-y-4 p-6">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Maintenance scheduled"
                  className="bg-background"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  name="description"
                  value={form.description}
                  required
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. The API will be down for 30 minutes on Saturday."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              {form.id && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Show this announcement on guest and client pages.</p>
                  </div>
                  <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              )}
              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
            </DialogBody>
            <DialogFooter className="border-t border-border px-6 py-4">
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(open) => { if (!open) setDeletingId(null); }}
          title="Delete Announcement"
          description="Permanently delete this announcement. It will disappear from all pages immediately."
          confirmLabel={
            <>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </>
          }
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminAnnouncementsPageContent />
    </Suspense>
  );
}
