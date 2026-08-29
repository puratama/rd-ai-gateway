"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const typeIcons: Record<string, ComponentType<{ className?: string }>> = {
  usage_alert: AlertTriangle,
  low_balance: Wallet,
  system: CheckCircle2,
};

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // abaikan kegagalan jaringan agar interval tidak memicu unhandled rejection
    }
  }

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PUT" });
    if (response.ok) {
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    }
  }

  async function markRead(item: NotificationItem) {
    if (item.read) return;
    const response = await fetch(`/api/notifications/${item.id}`, { method: "PUT" });
    if (response.ok) {
      setNotifications((items) =>
        items.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void loadNotifications(); }}>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon-sm" className="relative transition-colors hover:bg-muted/70" aria-label="Notifikasi">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-xs text-muted-foreground">{unreadCount} belum dibaca</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            Tandai semua dibaca
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Belum ada notifikasi</p>
          ) : (
            notifications.slice(0, 10).map((notification) => {
              const Icon = typeIcons[notification.type] ?? Bell;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => void markRead(notification)}
                  className={cn(
                    "flex rounded-none gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/60",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{notification.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
