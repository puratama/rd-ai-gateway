"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { Search, RefreshCw, Trash2, AlertTriangle, Users, MailCheck, MailX } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { FormSelect } from "@/components/ui/form-select";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  emailVerified: string | null;
  createdAt: string;
  usageCount: number;
  totalTokens: number;
  packageCount: number;
  activePlan: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

interface PackageItem {
  id: string;
  status: string;
  plan: { name: string };
  tokensRemaining: number;
  tokensTotal: number;
  expiresAt: string;
}

interface BillingItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface UsageItem {
  id: string;
  createdAt: string;
  model: string;
  totalTokens: number;
  source: string;
}

interface ApiKeyItem {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  usageCount: number;
  totalTokens: number;
  createdAt: string;
  lastUsed: string | null;
}

type UserDetail = AdminUser & {
  packages?: PackageItem[];
  usageRecords?: UsageItem[];
  billingRecords?: BillingItem[];
  apiKeys?: ApiKeyItem[];
  wallet?: { balance: number } | null;
};

const roles = ["user", "superadmin"];
const statuses = ["active", "suspended", "banned"];

const fmtRupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const fmtT = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    suspended: "bg-amber-500/10 text-amber-400",
    banned: "bg-destructive/10 text-destructive",
  };
  const dots: Record<string, string> = {
    active: "bg-emerald-400",
    suspended: "bg-amber-400",
    banned: "bg-destructive",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", colors[status] || colors.active)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[status] || dots.active)} />
      {status}
    </span>
  );
}

function VerifiedBadge({ emailVerified }: { emailVerified: string | null }) {
  if (emailVerified) {
    return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400"><MailCheck className="h-3 w-3" /> Verified</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><MailX className="h-3 w-3" /> Unverified</span>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hasPackageOnly, setHasPackageOnly] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<UserDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = useCallback(async (term: string, p: number, l: number, hasPackage: boolean) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(l) });
      if (term.trim()) params.set("search", term.trim());
      if (hasPackage) params.set("hasPackage", "true");
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchUsers(search, page, limit, hasPackageOnly), 300);
    return () => window.clearTimeout(timer);
  }, [fetchUsers, search, page, limit, hasPackageOnly]);

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;
    try {
      const res = await fetch(`/api/admin/users/${deletingUserId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setDeletingUserId(null);
      fetchUsers(search, page, limit, hasPackageOnly);
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const patchUser = async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(getApiErrorMessage(data, "Failed to update user"));
      return;
    }
    if (modalUser?.id === id) {
      setModalUser((prev) => prev ? { ...prev, ...patch as Partial<UserDetail> } : prev);
    }
    fetchUsers(search, page, limit, hasPackageOnly);
    toast.success("User updated");
  };

  const openModal = async (id: string) => {
    setModalLoading(true);
    setModalUser(null);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Failed to load user detail");
      const data = await res.json();
      setModalUser(data.user as UserDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user detail");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">Manage roles, status, verification, and monitor user data.</p>
          </div>
          <Button variant="outline" size="icon-lg" onClick={() => fetchUsers(search, page, limit, hasPackageOnly)} aria-label="Refresh users" title="Refresh users">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." className="pl-9" />
        </div>

        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {loading ? (
          <TableSkeleton rows={10} cols={9} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={search.trim() ? "Tidak ada user yang cocok dengan pencarian." : "Belum ada user terdaftar."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Verifikasi</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 text-right font-medium">Tokens</th>
                    <th className="px-4 py-3 text-right font-medium">Req</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openModal(user.id)}>
                      <td className="px-4 py-3 font-medium">{user.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.name || "\u2014"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                          user.role === "superadmin" ? "bg-violet-500/10 text-violet-400" : "bg-muted text-muted-foreground"
                        )}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                      <td className="px-4 py-3"><VerifiedBadge emailVerified={user.emailVerified} /></td>
                      <td className="px-4 py-3 text-xs">{user.activePlan || <span className="text-muted-foreground">Free</span>}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">{fmtT(user.totalTokens)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">{user.usageCount.toLocaleString()}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingUserId(user.id)} aria-label="Delete user" title="Delete user">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>{loading ? "Loading..." : `Showing ${users.length} of ${total} users`}</span>
              <div className="flex items-center gap-2">
                <span>Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="xs" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 text-xs">Prev</Button>
                  <Button variant="outline" size="xs" disabled={page >= Math.ceil(total / limit) || loading} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">Next</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <Dialog open={!!modalUser || modalLoading} onOpenChange={(open) => { if (!open) { setModalUser(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {modalLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : modalUser && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-lg">{modalUser.name || modalUser.email}</DialogTitle>
                    <DialogDescription className="text-xs">{modalUser.email} · {modalUser.id}</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <VerifiedBadge emailVerified={modalUser.emailVerified} />
                    <StatusBadge status={modalUser.status} />
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                {/* Actions row */}
                <div className="flex flex-wrap gap-2">
                  <Button size="xs" variant="outline" onClick={() => patchUser(modalUser.id, { verifyEmail: true })} disabled={!!modalUser.emailVerified}>
                    <MailCheck className="h-3.5 w-3.5 mr-1.5" /> Verifikasi Email
                  </Button>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Role:</span>
                    <FormSelect
                      options={roles.map((r) => ({ value: r, label: r }))}
                      value={roles.includes(modalUser.role) ? { value: modalUser.role, label: modalUser.role } : null}
                      onChange={(v) => v && patchUser(modalUser.id, { role: v })}
                      isClearable={false}
                      isSearchable={false}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Status:</span>
                    <FormSelect
                      options={statuses.map((s) => ({ value: s, label: s }))}
                      value={statuses.includes(modalUser.status) ? { value: modalUser.status, label: modalUser.status } : null}
                      onChange={(v) => v && patchUser(modalUser.id, { status: v })}
                      isClearable={false}
                      isSearchable={false}
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid gap-3 text-xs sm:grid-cols-3">
                  <CardDetail label="Created" value={fmtDate(modalUser.createdAt)} />
                  <CardDetail label="Wallet" value={modalUser.wallet ? fmtRupiah(Number(modalUser.wallet.balance)) : "No wallet"} />
                  <CardDetail label="Packages" value={String(modalUser.packageCount)} />
                </div>

                {/* Active packages */}
                {modalUser.packages && modalUser.packages.filter(p => p.status === "active").length > 0 && (
                  <Section title="Active Packages" color="blue">
                    {modalUser.packages.filter(p => p.status === "active").map(pkg => {
                      const pct = pkg.tokensTotal > 0 ? ((pkg.tokensTotal - pkg.tokensRemaining) / pkg.tokensTotal) * 100 : 0;
                      return (
                        <div key={pkg.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2 last:mb-0">
                          <div><span className="text-muted-foreground">Plan:</span> <span className="font-medium">{pkg.plan.name}</span></div>
                          <div><span className="text-muted-foreground">Remaining:</span> {pkg.tokensRemaining.toLocaleString()} / {pkg.tokensTotal.toLocaleString()}
                            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${100 - pct}%` }} />
                            </div>
                          </div>
                          <div><span className="text-muted-foreground">Used:</span> {pct.toFixed(0)}%</div>
                          <div><span className="text-muted-foreground">Expires:</span> {fmtDate(pkg.expiresAt)}</div>
                        </div>
                      );
                    })}
                  </Section>
                )}

                {/* No active plan */}
                {(!modalUser.packages || modalUser.packages.filter(p => p.status === "active").length === 0) && (
                  <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">No active package. User is on free tier.</div>
                )}

                {/* API Keys */}
                {modalUser.apiKeys && modalUser.apiKeys.length > 0 && (
                  <Section title="API Keys" color="violet">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left text-muted-foreground">
                          <tr>
                            <th className="px-3 py-1.5">Name</th>
                            <th className="px-3 py-1.5">Key</th>
                            <th className="px-3 py-1.5">Status</th>
                            <th className="px-3 py-1.5 text-right">Usage</th>
                            <th className="px-3 py-1.5">Last Used</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {modalUser.apiKeys.map((ak) => (
                            <tr key={ak.id}>
                              <td className="px-3 py-1.5 font-medium">{ak.name}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{ak.key.slice(0, 16)}...</td>
                              <td className="px-3 py-1.5">{ak.isActive ? <span className="text-emerald-400">Active</span> : <span className="text-muted-foreground">Inactive</span>}</td>
                              <td className="px-3 py-1.5 text-right">{fmtT(ak.totalTokens)}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{ak.lastUsed ? fmtDate(ak.lastUsed) : "\u2014"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}

                {/* Recent billing */}
                {modalUser.billingRecords && modalUser.billingRecords.length > 0 && (
                  <Section title={`Recent Billing (${modalUser.billingRecords.length})`} color="amber">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left text-muted-foreground">
                          <tr><th className="px-3 py-1.5">Date</th><th className="px-3 py-1.5">Type</th><th className="px-3 py-1.5 text-right">Amount</th><th className="px-3 py-1.5">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {modalUser.billingRecords.slice(0, 10).map((br) => (
                            <tr key={br.id}>
                              <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(br.createdAt)}</td>
                              <td className="px-3 py-1.5 capitalize">{br.type}</td>
                              <td className="px-3 py-1.5 text-right">{fmtRupiah(Number(br.amount))}</td>
                              <td className="px-3 py-1.5 capitalize">{br.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}

                {/* Recent usage */}
                {modalUser.usageRecords && modalUser.usageRecords.length > 0 && (
                  <Section title={`Recent Usage (${modalUser.usageRecords.length} records)`} color="primary">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left text-muted-foreground">
                          <tr><th className="px-3 py-1.5">Date</th><th className="px-3 py-1.5">Model</th><th className="px-3 py-1.5 text-right">Tokens</th><th className="px-3 py-1.5">Source</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {modalUser.usageRecords.slice(0, 10).map((r) => (
                            <tr key={r.id}>
                              <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                              <td className="px-3 py-1.5 font-medium truncate max-w-35">{r.model}</td>
                              <td className="px-3 py-1.5 text-right tabular-nums">{r.totalTokens.toLocaleString()}</td>
                              <td className="px-3 py-1.5 capitalize">{r.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <Dialog open={!!deletingUserId} onOpenChange={(open) => { if (!open) setDeletingUserId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></div>
              <DialogTitle>Delete User</DialogTitle>
            </div>
            <DialogDescription>This will permanently delete this user and all associated data. Cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUserId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium text-sm">{value}</div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const borderColors: Record<string, string> = {
    emerald: "border-emerald-500/30",
    blue: "border-blue-500/30",
    violet: "border-violet-500/30",
    amber: "border-amber-500/30",
    primary: "border-primary/30",
  };
  const textColors: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
    primary: "text-primary",
  };
  return (
    <div className={cn("rounded-lg border p-3", borderColors[color] || "border-border")}>
      <div className={cn("text-xs font-semibold mb-2", textColors[color] || "text-foreground")}>{title}</div>
      {children}
    </div>
  );
}
