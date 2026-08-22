import type { HTMLAttributes } from "react";

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
});

/**
 * Format a date as "28 Feb 2026" (date only).
 */
export function formatDate(value: Date | string | number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return DATE_ONLY_FORMATTER.format(d);
}

/**
 * Format a date as "28 Feb 2026, 22.10" (date + time).
 */
export function formatDateTime(value: Date | string | number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return DATE_TIME_FORMATTER.format(d);
}

/**
 * Format a date as "28 Feb" (short, no year).
 */
export function formatShortDate(value: Date | string | number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return SHORT_DATE_FORMATTER.format(d);
}

export function FormatDate({
  value,
  withTime = false,
  fallback,
  ...props
}: {
  value: Date | string | number | null | undefined;
  withTime?: boolean;
  fallback?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...props}>
      {withTime ? formatDateTime(value, fallback) : formatDate(value, fallback)}
    </span>
  );
}
