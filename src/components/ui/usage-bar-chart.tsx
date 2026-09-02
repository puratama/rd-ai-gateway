"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { formatCurrency } from "@/components/ui/format-currency";
import { formatShortDate } from "@/components/ui/format-date";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  TooltipItem,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

export interface DailyUsageItem {
  date: string;
  tokens: number;
  cost?: number;
  requests: number;
}

interface UsageBarChartProps {
  data: DailyUsageItem[];
  heightClass?: string;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ponytail: CSS vars di-resolve hanya di client (useEffect) untuk menghindari hydration mismatch.
// SSR selalu memakai fallback yang stabil.
function useCssVar(name: string, fallback: string): string {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) setValue(v);
  }, [name]);
  return value;
}

export function UsageBarChart({ data, heightClass = "h-72" }: UsageBarChartProps) {
  const primary = useCssVar("--color-primary", "oklch(0.68 0.16 235)");

  const chartData = useMemo(() => ({
    labels: data.map((day) => formatShortDate(day.date)),
    datasets: [{
      label: "Tokens",
      data: data.map((day) => day.tokens),
      backgroundColor: primary,
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  }), [data, primary]);

  const popover = useCssVar("--color-popover", "oklch(0.265 0.062 247)");
  const popoverFg = useCssVar("--color-popover-foreground", "oklch(0.97 0.015 240)");
  const border = useCssVar("--color-border", "oklch(0.39 0.065 246)");
  const mutedFg = useCssVar("--color-muted-foreground", "oklch(0.76 0.045 245)");

  const chartOptions = useMemo(() => {
    return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: popover,
        titleColor: popoverFg,
        bodyColor: popoverFg,
        borderColor: border,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => items[0]?.label ?? "",
          label: (item: TooltipItem<"bar">) => {
            const day = data[item.dataIndex];
            if (!day) return "";
            return [
              `Tokens: ${formatNumber(day.tokens)}`,
              `Requests: ${day.requests.toLocaleString("id-ID")}`,
              day.cost && day.cost > 0 ? `Cost: ${formatCurrency(day.cost)}` : "",
            ].filter(Boolean) as unknown as string[];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: mutedFg, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: border },
        ticks: {
          color: mutedFg,
          font: { size: 10 },
          callback: (value: string | number) => Number(value).toLocaleString("id-ID"),
        },
      },
    },
    };
  }, [data, popover, popoverFg, border, mutedFg]);

  return (
    <div className={heightClass} role="img" aria-label="Grafik penggunaan">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
