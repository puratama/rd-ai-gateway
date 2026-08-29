import type { HTMLAttributes } from "react";

const IDR_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return Number.isNaN(num) ? "Rp 0" : IDR_FORMATTER.format(num);
}

export function FormatCurrency({ value, ...props }: { value: number | string | null | undefined } & HTMLAttributes<HTMLSpanElement>) {
  return <span {...props}>{formatCurrency(value)}</span>;
}
