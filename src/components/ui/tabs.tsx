"use client";

import { useRef } from "react";
import type { ComponentType, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  value: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  disabled?: boolean;
  /** Id of the tabpanel this tab controls (aria-controls linkage). */
  panelId?: string;
}

interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function Tabs({ items, value, onValueChange, ariaLabel, className }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = (fromIndex: number, delta: number | "home" | "end") => {
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);
    if (enabled.length === 0) return;
    let target: number;
    if (delta === "home") target = enabled[0].index;
    else if (delta === "end") target = enabled[enabled.length - 1].index;
    else {
      const pos = enabled.findIndex(({ index }) => index === fromIndex);
      const next = enabled[(pos + delta + enabled.length) % enabled.length];
      target = next.index;
    }
    tabRefs.current[target]?.focus();
    onValueChange(items[target].value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const fromIndex = items.findIndex((item) => item.value === value);
    if (fromIndex === -1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(fromIndex, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(fromIndex, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(fromIndex, "home");
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(fromIndex, "end");
    }
  };

  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-lg border border-border/40 bg-muted/40 p-1",
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
          type="button"
          role="tab"
          id={item.panelId ? `${item.panelId}-tab` : undefined}
          aria-selected={value === item.value}
          aria-controls={item.panelId}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onValueChange(item.value)}
          disabled={item.disabled}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
            value === item.value
              ? "bg-primary font-semibold text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          )}
        >
          {item.icon && <item.icon className="h-4 w-4" />}
          {item.label}
        </button>
      ))}
    </div>
  );
}
