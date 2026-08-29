"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string;
}

export default function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) setItems(d?.announcements ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // rotate announcement every 10s when there are multiple
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 10000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[index % items.length];

  return (
    <div role="region" aria-label="Pengumuman" className="flex h-8 shrink-0 items-center justify-center overflow-hidden border-b border-border bg-linear-to-r from-warning/10 via-warning/5 to-warning/10 px-4 text-foreground">
      <div
        key={item.id}
        aria-live="polite"
        className="flex min-w-0 items-center gap-2 text-xs sm:text-sm font-medium text-foreground transition-opacity duration-200 announce-enter"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning animate-pulse" aria-hidden="true" />
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0 font-bold">{item.title}</span>
        <span className="shrink-0 opacity-60">-</span>
        <span className="truncate">{item.description}</span>
      </div>
    </div>
  );
}
