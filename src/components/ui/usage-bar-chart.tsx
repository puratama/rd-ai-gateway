"use client";

import { useMemo } from "react";
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

// ponytail: warna di-resolve sekali saat render; ganti tema tidak me-refresh chart — tambah listener/dep bila tema dinamis dibutuhkan.
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function UsageBarChart({ data, heightClass = "h-72" }: UsageBarChartProps) {
  const chartData = useMemo(() => ({
    labels: data.map((day) => formatShortDate(day.date)),
    datasets: [{
      label: "Tokens",
      data: data.map((day) => day.tokens),
      backgroundColor: cssVar("--color-primary", "oklch(0.68 0.16 235)"),
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  }), [data]);

  const chartOptions = useMemo(() => {
    const popover = cssVar("--color-popover", "oklch(0.265 0.062 247)");
    const popoverFg = cssVar("--color-popover-foreground", "oklch(0.97 0.015 240)");
    const border = cssVar("--color-border", "oklch(0.39 0.065 246)");
    const mutedFg = cssVar("--color-muted-foreground", "oklch(0.76 0.045 245)");
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
  }, [data]);

  return (
    <div className={heightClass} role="img" aria-label="Grafik penggunaan">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
