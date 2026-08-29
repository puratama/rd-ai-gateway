"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const HEALTH_META = {
  checking: { label: "Memeriksa status…", cls: "text-muted-foreground", dot: "bg-muted-foreground/60" },
  ok: { label: "Semua sistem beroperasi", cls: "text-success", dot: "bg-success" },
  degraded: { label: "Performa menurun", cls: "text-warning", dot: "bg-warning" },
  down: { label: "Gangguan terdeteksi", cls: "text-destructive", dot: "bg-destructive" },
} as const;

type Health = keyof typeof HEALTH_META;

/** Badge status kesehatan sistem. Fetch /api/health sendiri; dot berdenyut saat ok. */
export function HealthBadge({
  className,
  withBorder = false,
}: {
  className?: string;
  withBorder?: boolean;
}) {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const check = () => {
      fetch("/api/health", { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (active) setHealth(d?.status ?? "down"); })
        .catch(() => { if (active) setHealth("down"); });
    };
    check();
    const interval = window.setInterval(check, 60_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const hm = HEALTH_META[health];

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/40 backdrop-blur-sm transition-colors duration-200 hover:bg-card/80",
        withBorder && "rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", hm.dot, health === "ok" && "pulse-glow")} />
      <span className={hm.cls}>{hm.label}</span>
    </span>
  );
}
