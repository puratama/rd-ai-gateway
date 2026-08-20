"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { formatCurrency } from "@/components/ui/format-currency";
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

function shortDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}



export function UsageBarChart({ data, heightClass = "h-72" }: UsageBarChartProps) {
  const chartData = useMemo(() => ({
    labels: data.map((day) => shortDate(day.date)),
    datasets: [{
      label: "Tokens",
      data: data.map((day) => day.tokens),
      backgroundColor: "oklch(0.68 0.16 235)",
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  }), [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "oklch(0.265 0.062 247)",
        titleColor: "oklch(0.97 0.015 240)",
        bodyColor: "oklch(0.97 0.015 240)",
        borderColor: "oklch(0.39 0.065 246)",
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
        ticks: { color: "oklch(0.76 0.045 245)", font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "oklch(0.39 0.065 246 / 0.4)" },
        ticks: {
          color: "oklch(0.76 0.045 245)",
          font: { size: 10 },
          callback: (value: string | number) => Number(value).toLocaleString("id-ID"),
        },
      },
    },
  }), [data]);

  return (
    <div className={heightClass}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
