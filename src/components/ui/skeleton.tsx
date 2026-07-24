"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="animate-pulse">
        <div className="h-11 bg-muted/50" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border flex items-center gap-4 px-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className={cn("h-4", j === 0 ? "w-24" : "w-16")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function CardRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="bg-muted/30 rounded-lg p-2">
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-end gap-1 h-32">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-muted"
            style={{ height: `${10 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export {
  Skeleton,
  TableSkeleton,
  CardGridSkeleton,
  CardRowSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
};
