"use client";

import { useState } from "react";
import { UserPlus, User, Mail, Building2, Globe, Trash2 } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSection, FormPanel } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  isActive: boolean;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(form: UserForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Nama tidak boleh kosong.";
  if (!form.email.trim()) {
    errors.email = "Email tidak boleh kosong.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Format email tidak valid.";
  }
  if (form.phone && !/^\+?[\d\s\-()]{7,20}$/.test(form.phone)) {
    errors.phone = "Format nomor telepon tidak valid.";
  }
  if (form.website && !/^https?:\/\/.+\..+/.test(form.website)) {
    errors.website = "URL harus dimulai dengan http:// atau https://";
  }
  return errors;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  isActive: true,
};

// Dummy data untuk tabel preview
const SAMPLE_USERS: UserEntry[] = [
  { id: "1", name: "Rizky Pratama", email: "rizky@example.com", phone: "+62 812-3456-7890", company: "Acme Corp", website: "https://acme.com", isActive: true },
  { id: "2", name: "Sari Dewi", email: "sari@example.com", phone: "+62 878-9012-3456", company: "Beta Ltd", website: "", isActive: false },
];

// ─── UserForm Component ────────────────────────────────────────────────────────

function UserFormPanel({
  user,
  onSave,
  onClose,
}: {
  user: UserEntry | null;
  onSave: (data: UserForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserForm>(
    user
      ? { name: user.name, email: user.email, phone: user.phone, company: user.company, website: user.website, isActive: user.isActive }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSave = async () => {
    const validation = validateForm(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogBody className="space-y-5">
        {/* ── Identitas ── */}
        <section>
          <FormSection>Identitas</FormSection>
          <FormPanel className="space-y-3">
            {/* Nama */}
            <div>
              <Label htmlFor="user-name">
                Nama Lengkap <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="bg-background"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "user-name-error" : undefined}
              />
              {errors.name && (
                <p id="user-name-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="user-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="nama@domain.com"
                className="bg-background"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "user-email-error" : undefined}
              />
              {errors.email && (
                <p id="user-email-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="user-phone">Nomor Telepon</Label>
              <Input
                id="user-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+62 812-3456-7890"
                className="bg-background"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "user-phone-error" : undefined}
              />
              {errors.phone && (
                <p id="user-phone-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.phone}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/60">
                Format: +62 8xx-xxxx-xxxx (opsional)
              </p>
            </div>
          </FormPanel>
        </section>

        {/* ── Organisasi ── */}
        <section>
          <FormSection>Organisasi</FormSection>
          <FormPanel className="space-y-3">
            {/* Company */}
            <div>
              <Label htmlFor="user-company">Nama Perusahaan</Label>
              <Input
                id="user-company"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="e.g. Acme Corp"
                className="bg-background"
              />
            </div>

            {/* Website */}
            <div>
              <Label htmlFor="user-website">Website</Label>
              <Input
                id="user-website"
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://example.com"
                className="bg-background font-mono text-xs"
                aria-invalid={!!errors.website}
                aria-describedby={errors.website ? "user-website-error" : undefined}
              />
              {errors.website && (
                <p id="user-website-error" role="alert" className="mt-1.5 text-xs text-destructive">
                  {errors.website}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground/60">
                URL lengkap termasuk https:// (opsional)
              </p>
            </div>
          </FormPanel>
        </section>

        {/* ── Status ── */}
        <section>
          <FormSection>Status</FormSection>
          <FormPanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Akun Aktif</p>
                <p className="text-xs text-muted-foreground/60">
                  Akun yang tidak aktif tidak dapat login ke sistem.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => update("isActive", v)}
                aria-label="Toggle status aktif akun"
              />
            </div>
          </FormPanel>
        </section>
    </DialogBody>

      {/* ── Footer ── */}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} type="button">
          Batal
        </Button>
        <Button onClick={handleSave} disabled={saving} type="button">
          {saving ? (
            <>
              <svg
                className="animate-spin motion-reduce:animate-none -ml-1 mr-1.5 h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Menyimpan...
            </>
          ) : user ? (
            "Update"
          ) : (
            "Simpan"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModalDemoPage() {
  const [users, setUsers] = useState<UserEntry[]>(SAMPLE_USERS);
  const [editing, setEditing] = useState<UserEntry | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setShowCreate(true);
  };

  const openEdit = (user: UserEntry) => {
    setEditing(user);
    setShowCreate(true);
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditing(null);
  };

  const handleSave = async (data: UserForm) => {
    // Simulate async save
    await new Promise((r) => setTimeout(r, 600));
    if (editing) {
      setUsers((prev) => prev.map((u) => u.id === editing.id ? { ...u, ...data } : u));
      toast.success("Data berhasil diperbarui.");
    } else {
      const newUser: UserEntry = { id: Date.now().toString(), ...data };
      setUsers((prev) => [...prev, newUser]);
      toast.success("Pengguna baru berhasil ditambahkan.");
    }
    closeForm();
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setUsers((prev) => prev.filter((u) => u.id !== deletingId));
    setDeletingId(null);
    toast.success("Pengguna berhasil dihapus.");
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Modal Demo</h1>
            <p className="text-sm text-muted-foreground">
              Contoh modal form fungsional mengikuti pola desain halaman admin/models.
            </p>
          </div>
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground [&_tr]:border-b [&_tr]:border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Perusahaan</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium sr-only">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border transition-colors duration-150 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 opacity-50" />
                        {user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {user.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 opacity-50" />
                          {user.company}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          user.isActive
                            ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-success/10 text-success"
                            : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                        }
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                        {user.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${user.name}`}
                          title="Edit pengguna"
                          onClick={() => openEdit(user)}
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Hapus ${user.name}`}
                          title="Hapus pengguna"
                          onClick={() => setDeletingId(user.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Create / Edit Modal ── */}
        <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeForm(); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  {editing ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {editing
                    ? "Perbarui informasi identitas, organisasi, dan status akun."
                    : "Isi informasi pengguna baru. Kolom bertanda * wajib diisi."}
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Form body + footer */}
            <UserFormPanel
              user={editing}
              onSave={handleSave}
              onClose={closeForm}
            />
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Modal ── */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(open) => { if (!open) setDeletingId(null); }}
          title="Hapus Pengguna"
          description="Tindakan ini akan menghapus pengguna secara permanen dari sistem. Data yang terkait tidak dapat dipulihkan."
          cancelLabel="Batal"
          confirmLabel={
            <>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
            </>
          }
          onConfirm={handleDelete}
        />

      </div>
    </AppShell>
  );
}
