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
    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setItems(d?.announcements ?? []))
      .catch(() => {});
  }, []);

  // rotate announcement every 5s when there are multiple
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 10000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[index % items.length];

  return (
    <div className="flex h-8 shrink-0 items-center justify-center overflow-hidden border-b border-amber-600/40 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 px-4">
      <div
        key={item.id}
        className="flex min-w-0 items-center gap-2 text-xs font-medium text-amber-950 announce-enter"
      >
        <Megaphone className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0 font-bold">{item.title}</span>
        <span className="shrink-0 opacity-60">-</span>
        <span className="truncate">{item.description}</span>
      </div>
    </div>
  );
}
