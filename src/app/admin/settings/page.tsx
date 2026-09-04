"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Edit3,
  Trash2,
  Save,
  Building2,
  Globe,
  Image,
  Link2,
  FileText,
  Palette,
  Send,
} from "lucide-react";
import type { SiteSettings } from "@/lib/site-settings";
import { getApiErrorMessage } from "@/lib/api-error";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSelect, type SelectOption } from "@/components/ui/form-select";
import { FormSection, FormPanel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Tabs } from "@/components/ui/tabs";

type SettingsTabId = "site" | "payment" | "telegram";

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin motion-reduce:animate-none h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <AdminSettingsContent />
    </Suspense>
  );
}

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTabId | null;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabParam || "site");

  useEffect(() => {
    const current = searchParams.get("tab") as SettingsTabId | null;
    if (current && current !== activeTab) setActiveTab(current);
  }, []);

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi payment gateway.
          </p>
        </div>

        <Tabs
          items={[
            { value: "site", label: "Site", icon: Globe },
            { value: "payment", label: "Payment Gateway", icon: Building2 },
            { value: "telegram", label: "Telegram", icon: Send },
          ]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as SettingsTabId)}
          ariaLabel="Admin settings sections"
        />

        {activeTab === "site" && <SiteSettingsSection />}
        {activeTab === "payment" && <PaymentGatewaySection />}
        {activeTab === "telegram" && <TelegramSection />}
      </div>
    </AppShell>
  );
}

// ─── Payment Gateway ──────────────────────────────────────────────────────

interface GatewayItem {
  id: string;
  provider: string;
  name: string;
  hasServerKey: boolean;
  hasClientKey: boolean;
  hasQrisPayload: boolean;
  environment: string;
  isActive: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  midtrans: "Midtrans",
  xendit: "Xendit",
  qris: "QRIS Merchant",
};

const PROVIDER_KEY_LABELS: Record<string, { server: string; client: string }> = {
  midtrans: { server: "Server Key", client: "Client Key" },
  xendit: { server: "Secret Key", client: "Callback Token" },
  qris: { server: "Payload QRIS Statis", client: "Callback Token (opsional)" },
};

function PaymentGatewaySection() {
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<GatewayItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/payment");
      if (res.ok) {
        const data = await res.json();
        setGateways(data);
      }
    } catch {
      setError("Failed to load payment gateways");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/admin/settings/payment?id=${deletingId}`, {
        method: "DELETE",
      });
      setDeletingId(null);
      fetchGateways();
    } catch {
      setError("Failed to delete gateway");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Payment Gateways</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi payment gateway (Midtrans / Xendit).
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(true);
            setEditing(null);
          }}
        >
          <Plus className="w-4 h-4" /> Add Gateway
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={7} />
      ) : gateways.length === 0 ? (
        <EmptyState icon={Building2} title="Belum ada payment gateway." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 font-medium">Provider</TableHead>
                <TableHead className="px-4 font-medium">Nama</TableHead>
                <TableHead className="px-4 font-medium">Environment</TableHead>
                <TableHead className="px-4 font-medium">Server Key</TableHead>
                <TableHead className="px-4 font-medium">Client Key</TableHead>
                <TableHead className="px-4 text-center font-medium">Status</TableHead>
                <TableHead className="px-4 font-medium">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gateways.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        g.provider === "midtrans"
                          ? "bg-info/10 text-info"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {PROVIDER_LABELS[g.provider] || g.provider}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium">{g.name}</TableCell>
                  <TableCell className="px-4 py-3 capitalize text-muted-foreground">
                    {g.environment}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        (g.provider === "qris" ? g.hasQrisPayload : g.hasServerKey)
                          ? "text-success text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {(g.provider === "qris" ? g.hasQrisPayload : g.hasServerKey) ? "••••••••" : "None"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={
                        g.hasClientKey
                          ? "text-success text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {g.hasClientKey ? "••••••••" : "None"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        g.isActive
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          g.isActive ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                      {g.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit gateway"
                        title="Edit gateway"
                        onClick={() => {
                          setEditing(g);
                          setShowCreate(true);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingId(g.id)}
                        aria-label="Delete gateway"
                        title="Delete gateway"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!o) {
            setShowCreate(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {editing ? "Edit Gateway" : "Add Gateway"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {editing
                  ? "Update konfigurasi payment gateway."
                  : "Tambah payment gateway baru."}
              </DialogDescription>
            </div>
          </DialogHeader>
          <GatewayForm
            gateway={editing}
            onSave={async (data) => {
              const res = editing
                ? await fetch("/api/admin/settings/payment", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editing.id, ...data }),
                  })
                : await fetch("/api/admin/settings/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Save failed" }));
                throw new Error(getApiErrorMessage(err, "Save failed"));
              }
              setShowCreate(false);
              setEditing(null);
              fetchGateways();
            }}
            onClose={() => {
              setShowCreate(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => { if (!o) setDeletingId(null); }}
        title="Delete Gateway"
        description="Ini akan menghapus konfigurasi payment gateway secara permanen. Transaksi yang menggunakan gateway ini akan gagal."
        cancelLabel="Batal"
        confirmLabel={
          <>
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </>
        }
        onConfirm={handleDelete}
      />
    </div>
  );
}

function GatewayForm({
  gateway,
  onSave,
  onClose,
}: {
  gateway: GatewayItem | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    provider: "midtrans",
    name: "",
    serverKey: "",
    clientKey: "",
    environment: "sandbox",
    isActive: true,
  });
  // Sinkronkan form tiap kali gateway berubah (pre-population yang akurat)
  useEffect(() => {
    setForm({
      provider: gateway?.provider || "midtrans",
      name: gateway?.name || "",
      serverKey: "", // Selalu reset — jangan tampilkan kredensial lama
      clientKey: "",
      environment: gateway?.environment || "sandbox",
      isActive: gateway?.isActive ?? true,
    });
  }, [gateway]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const keyLabels = PROVIDER_KEY_LABELS[form.provider] || PROVIDER_KEY_LABELS.midtrans;

  const providerOptions: SelectOption[] = [
    { value: "midtrans", label: "Midtrans" },
    { value: "xendit", label: "Xendit" },
    { value: "qris", label: "QRIS Merchant" },
  ];
  const envOptions: SelectOption[] = [
    { value: "sandbox", label: "Sandbox" },
    { value: "production", label: "Production" },
  ];
  const findOpt = (opts: SelectOption[], v: string) =>
    opts.find((o) => o.value === v) ?? null;

  const handleSave = async () => {
    setSaving(true);
    setFormError("");
    const data: Record<string, unknown> = {
      provider: form.provider,
      name: form.name,
      environment: form.environment,
      isActive: form.isActive,
    };
    if (form.provider === "qris") {
      if (form.serverKey) data.qrisPayload = form.serverKey;
      if (form.clientKey) data.clientKey = form.clientKey;
    } else {
      if (form.serverKey) data.serverKey = form.serverKey;
      if (form.clientKey) data.clientKey = form.clientKey;
    }
    try {
      await onSave(data);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  return (
    <>
      <DialogBody className="space-y-5">
        {formError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        {/* ── General ── */}
        <section>
          <FormSection>General</FormSection>
          <FormPanel>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <FormSelect
                  options={providerOptions}
                  value={findOpt(providerOptions, form.provider)}
                  onChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      provider: v || "midtrans",
                      name: gateway ? p.name : (v ? PROVIDER_LABELS[v] || v : ""),
                    }))
                  }
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              <div>
                <Label>Nama</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder={`e.g. ${PROVIDER_LABELS[form.provider]}`}
                  className="bg-background"
                />
              </div>
            </div>
          </FormPanel>
        </section>

        {/* ── Credentials ── */}
        <section>
          <FormSection>Credentials</FormSection>
          <FormPanel className="space-y-3">
            {form.provider === "qris" ? (
              <>
                <div>
                  <Label>{keyLabels.server}</Label>
                  <Textarea
                    value={form.serverKey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, serverKey: e.target.value }))
                    }
                    placeholder={
                      gateway ? "Kosongkan untuk tidak mengubah" : "0002010102112637..."
                    }
                    rows={4}
                    className="bg-background font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    String EMVCo &ldquo;000201...&rdquo; milik merchant. Akan di-mask: tag 01 jadi dinamis (12) dan tag 54 berisi nominal, CRC16 dihitung ulang. Peringatan: QR statis yang di-mask tidak dijamin diterima semua bank/e-wallet.
                  </p>
                </div>
                <div>
                  <Label>{keyLabels.client}</Label>
                  <Input
                    type="password"
                    value={form.clientKey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, clientKey: e.target.value }))
                    }
                    placeholder={
                      gateway
                        ? "Kosongkan untuk tidak mengubah"
                        : "Token verifikasi webhook (opsional)"
                    }
                    className="bg-background"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>{keyLabels.server}</Label>
                  <Input
                    type="password"
                    value={form.serverKey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, serverKey: e.target.value }))
                    }
                    placeholder={
                      gateway
                        ? "Kosongkan untuk tidak mengubah"
                        : form.provider === "midtrans"
                        ? "SB-Mid-server-..."
                        : "xnd_..."
                    }
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label>{keyLabels.client}</Label>
                  <Input
                    type="password"
                    value={form.clientKey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, clientKey: e.target.value }))
                    }
                    placeholder={
                      gateway
                        ? "Kosongkan untuk tidak mengubah"
                        : form.provider === "midtrans"
                        ? "SB-Mid-client-..."
                        : "Token verifikasi callback"
                    }
                    className="bg-background"
                  />
                </div>
              </>
            )}
          </FormPanel>
        </section>

        {/* ── Environment & Status ── */}
        <section>
          <FormSection>Environment &amp; Status</FormSection>
          <FormPanel className="space-y-4">
            {form.provider !== "qris" && (
              <div>
                <Label>Environment</Label>
                <FormSelect
                  options={envOptions}
                  value={findOpt(envOptions, form.environment)}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, environment: v || "sandbox" }))
                  }
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Gateway Active</p>
                <p className="text-xs text-muted-foreground/60">
                  Saat nonaktif, gateway tidak dipakai untuk transaksi.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
          </FormPanel>
        </section>
      </DialogBody>

      {/* ── Footer ── */}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button onClick={handleSave} disabled={saving || !form.name}>
          {saving ? "Menyimpan..." : gateway ? "Update" : "Tambah"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Telegram Bot ─────────────────────────────────────────────────────────

function TelegramSection() {
  const [hasToken, setHasToken] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [chatIdsText, setChatIdsText] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/telegram");
      if (res.ok) {
        const data = await res.json();
        setHasToken(data.hasToken);
        setChatIdsText((data.adminChatIds || []).join("\n"));
        setIsEnabled(data.isEnabled);
      }
    } catch {
      setError("Failed to load telegram config");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (test = false) => {
    setSaving(true);
    setError("");
    try {
      const adminChatIds = chatIdsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/settings/telegram", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(botToken ? { botToken } : {}),
          adminChatIds,
          isEnabled,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(getApiErrorMessage(err, "Save failed"));
      }
      const data = await res.json();
      setHasToken(data.hasToken);
      setBotToken("");
      toast.success("Telegram config tersimpan");

      if (test) {
        setTesting(true);
        try {
          const t = await fetch("/api/admin/settings/telegram/test", { method: "POST" });
          const td = await t.json();
          if (td.ok) toast.success(td.message);
          else toast.error(td.message || td.error || "Test gagal");
        } catch {
          toast.error("Test gagal");
        }
        setTesting(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Telegram Bot</h2>
          <p className="text-xs text-muted-foreground">
            Jalur verifikasi pembayaran manual (QRIS) lewat bot Telegram.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={saving || testing}
          >
            {testing ? "Testing..." : "Test"}
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-primary" /> Kredensial Bot
          </CardTitle>
          <CardDescription>
            Buat bot lewat @BotFather untuk mendapatkan token, lalu daftarkan Chat ID admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Bot Token</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={
                  hasToken ? "•••••••• (kosongkan untuk tidak mengubah)" : "123456789:AA...token dari @BotFather"
                }
                className="h-9 flex-1 bg-background"
              />
              {hasToken && (
                <span className="shrink-0 text-xs text-success">Terpasang</span>
              )}
            </div>
          </div>

          <div>
            <Label>Chat ID Admin</Label>
            <Textarea
              value={chatIdsText}
              onChange={(e) => setChatIdsText(e.target.value)}
              rows={4}
              className="bg-background font-mono text-xs"
              placeholder={"123456789\n987654321"}
            />
            <p className="mt-1 text-xs text-muted-foreground/70">
              Buka bot ini di Telegram, kirim /start, lalu salin &ldquo;Chat ID Anda&rdquo; ke sini (satu per
              baris). Chat yang terdaftar menerima notifikasi bukti pembayaran dan bisa
              approve/reject.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Aktifkan Bot</p>
              <p className="text-xs text-muted-foreground/60">
                Long-polling berjalan saat aktif; keluar otomatis saat nonaktif.
              </p>
            </div>
            <Switch checked={isEnabled} onChange={(v) => setIsEnabled(v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Site Settings ─────────────────────────────────────────────────────────

function SiteField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

const LOGO_MODE_OPTIONS: SelectOption[] = [
  { value: "logo", label: "Hanya Logo" },
  { value: "logo-name", label: "Logo + Nama" },
  { value: "name", label: "Hanya Nama" },
];

function SiteSettingsSection() {
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/site");
      if (res.ok) setForm(await res.json());
    } catch {
      setError("Failed to load site settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const set = (field: keyof SiteSettings, value: string) =>
    setForm((prev) =>
      prev ? ({ ...prev, [field]: value } as SiteSettings) : prev
    );

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      setForm(await res.json());
      toast.success("Site settings updated");
    } catch {
      setError("Failed to save site settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 animate-pulse lg:grid-cols-2">
        <div className="h-80 rounded-xl border border-border bg-card lg:col-span-2" />
        <div className="h-56 rounded-xl border border-border bg-card" />
        <div className="h-56 rounded-xl border border-border bg-card" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        {error || "Gagal memuat pengaturan situs."}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Site Settings</h2>
          <p className="text-xs text-muted-foreground">
            Nama situs, branding, dan metadata diterapkan di seluruh situs.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-primary" /> Branding
            </CardTitle>
            <CardDescription>
              Identitas visual situs: nama, logo, favicon, dan deskripsi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {form.logoUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Image className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <div className="grid flex-1 grid-cols-1 gap-3">
                <SiteField label="Nama Situs">
                  <Input
                    value={form.siteName}
                    onChange={(e) => set("siteName", e.target.value)}
                    placeholder="Nama situs"
                    className="bg-background"
                  />
                </SiteField>
              </div>
            </div>

            <SiteField label="Tagline">
              <Input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                className="bg-background"
              />
            </SiteField>

            <SiteField label="Deskripsi Situs">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="bg-background"
              />
            </SiteField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ImageUploadField
                label="Logo URL"
                hint="URL gambar. Dipakai di navbar & footer."
                value={form.logoUrl}
                uploadType="logo"
                placeholder="https://.../logo.png"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                onChange={(v) => set("logoUrl", v)}
              />
              <ImageUploadField
                label="Favicon URL"
                hint="Tampil di tab browser (ikon situs)."
                value={form.faviconUrl}
                uploadType="favicon"
                placeholder="https://.../favicon.ico"
                accept=".png,.ico,.svg,.webp"
                onChange={(v) => set("faviconUrl", v)}
              />
            </div>

            <SiteField
              label="Mode Logo"
              hint="logo: hanya logo (lebar otomatis, h-8). logo-name: logo + nama. name: hanya nama."
            >
              <FormSelect
                options={LOGO_MODE_OPTIONS}
                value={LOGO_MODE_OPTIONS.find((o) => o.value === form.logoMode) ?? LOGO_MODE_OPTIONS[0]}
                onChange={(v) => set("logoMode", v ?? "logo-name")}
                isClearable={false}
                isSearchable={false}
              />
            </SiteField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" /> Meta & SEO
            </CardTitle>
            <CardDescription>
              Metadata untuk mesin pencari dan social share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SiteField label="Meta Title">
              <Input
                value={form.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
                className="bg-background"
              />
            </SiteField>
            <SiteField label="Meta Description">
              <Textarea
                value={form.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                className="bg-background"
              />
            </SiteField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4 text-primary" /> Links
            </CardTitle>
            <CardDescription>
              Tautan eksternal yang dipakai di seluruh situs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <SiteField label="Base URL" hint="Endpoint API gateway (mis. https://api.site.com/v1).">
              <Input
                value={form.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://api.example.com/v1"
                className="h-9 bg-background"
              />
            </SiteField>
            <SiteField
              label="Prefix API Key"
              hint="Awalan kunci API publik yang dibuat user (mis. xpgw_). Hanya huruf, angka, _ atau -, maks 32 karakter."
            >
              <Input
                value={form.apiKeyPrefix}
                onChange={(e) => set("apiKeyPrefix", e.target.value)}
                placeholder="xpgw_"
                className="h-9 bg-background"
              />
            </SiteField>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


