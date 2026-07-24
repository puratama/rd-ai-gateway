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
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const typeIcons: Record<string, ComponentType<{ className?: string }>> = {
  usage_alert: AlertTriangle,
  subscription_expiry: CreditCard,
  low_balance: Wallet,
  system: CheckCircle2,
};

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as {
      notifications?: Notification[];
      unreadCount?: number;
    };
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
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

  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${id}`, { method: "PUT" });
    if (response.ok) {
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) void loadNotifications(); }}>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            notifications.slice(0, 10).map((notification) => {
              const Icon = typeIcons[notification.type] ?? Bell;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => void markRead(notification.id)}
                  className={cn(
                    "flex rounded-none gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer",
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
