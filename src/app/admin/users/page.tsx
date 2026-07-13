"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  puterStatus: string;
  createdAt: string;
  usageCount: number;
  totalTokens: number;
  subscriptionCount: number;
  packageCount: number;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

type UserDetail = AdminUser & Record<string, unknown>;
type UserPatch = Pick<AdminUser, "role" | "puterStatus">;

const roles = ["user", "admin", "superadmin"];
const statuses = ["active", "pending", "suspended", "disabled"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, UserDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: "1", limit: "20" });
      if (term.trim()) params.set("search", term.trim());
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
    const timer = window.setTimeout(() => fetchUsers(search), 300);
    return () => window.clearTimeout(timer);
  }, [fetchUsers, search]);

  const patchUser = async (id: string, patch: Partial<UserPatch>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError("Failed to update user");
      return;
    }
    setUsers((items) => items.map((user) => (user.id === id ? { ...user, ...patch } : user)));
    setDetails((items) => (items[id] ? { ...items, [id]: { ...items[id], ...patch } } : items));
  };

  const toggleDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (details[id]) return;
    setDetailLoading(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Failed to load user detail");
      const data: { user: UserDetail } = await res.json();
      setDetails((items) => ({ ...items, [id]: data.user }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user detail");
    } finally {
      setDetailLoading(null);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Users</h1>
            <p className="text-sm text-muted-foreground">Manage roles, Puter status, and usage.</p>
          </div>
          <Button variant="outline" onClick={() => fetchUsers(search)} className="cursor-pointer">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users..."
            className="pl-9"
          />
        </div>

        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <FragmentRow
                    key={user.id}
                    user={user}
                    expanded={expandedId === user.id}
                    detail={details[user.id]}
                    detailLoading={detailLoading === user.id}
                    onToggle={() => toggleDetail(user.id)}
                    onPatch={(patch) => patchUser(user.id, patch)}
                  />
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {loading ? "Loading users..." : `Showing ${users.length} of ${total} users`}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FragmentRow({
  user,
  expanded,
  detail,
  detailLoading,
  onToggle,
  onPatch,
}: {
  user: AdminUser;
  expanded: boolean;
  detail?: UserDetail;
  detailLoading: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<UserPatch>) => void;
}) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-muted/40" onClick={onToggle}>
        <td className="px-4 py-3">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
        <td className="px-4 py-3 font-medium">{user.email}</td>
        <td className="px-4 py-3 text-muted-foreground">{user.name || "—"}</td>
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <select
            value={user.role}
            onChange={(event) => onPatch({ role: event.target.value })}
            className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {[...new Set([user.role, ...roles])].map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <select
            value={user.puterStatus}
            onChange={(event) => onPatch({ puterStatus: event.target.value })}
            className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {[...new Set([user.puterStatus, ...statuses])].map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{user.totalTokens.toLocaleString()}</td>
        <td className="px-4 py-3 text-right tabular-nums">{user.usageCount.toLocaleString()}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-muted/20 px-4 py-4">
            {detailLoading && <p className="text-sm text-muted-foreground">Loading detail...</p>}
            {detail && (
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <Detail label="Created" value={new Date(detail.createdAt).toLocaleString()} />
                <Detail label="Subscriptions" value={detail.subscriptionCount} />
                <Detail label="Packages" value={detail.packageCount} />
                <Detail label="ID" value={detail.id} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{value}</div>
    </div>
  );
}
