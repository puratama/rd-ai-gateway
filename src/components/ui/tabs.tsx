"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs({ items, value, onValueChange, ariaLabel, className }: TabsProps) {
  return (
    <div className={cn("inline-flex w-fit rounded-xl border border-border/50 bg-card p-1", className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onValueChange(item.value)}
          disabled={item.disabled}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            value === item.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          {item.label}
        </button>
      ))}
    </div>
  );
}
