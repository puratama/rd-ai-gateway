import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

/** Build a compact list of page numbers with ellipsis (1 … 4 5 6 … 20). */
function pageItems(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 1) items.push("…");
  items.push(pageCount);
  return items;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4" aria-label="Pagination">
      <span className="text-xs text-muted-foreground">Halaman {page} dari {pageCount}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1 disabled:opacity-50"
          )}
        >
          <ChevronLeft /> <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {pageItems(page, pageCount).map((it, i) =>
          it === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground select-none" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onPageChange(it)}
              aria-label={`Halaman ${it}`}
              aria-current={it === page ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: it === page ? "default" : "ghost", size: "icon-sm" }),
                "tabular-nums"
              )}
            >
              {it}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Halaman berikutnya"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1 disabled:opacity-50"
          )}
        >
          <span className="hidden sm:inline">Berikutnya</span> <ChevronRight />
        </button>
      </div>
    </nav>
  );
}
