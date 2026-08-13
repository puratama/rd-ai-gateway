import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-between gap-3 border-t pt-4" aria-label="Pagination">
      <span className="text-xs text-muted-foreground">Halaman {page} dari {pageCount}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Halaman sebelumnya">
          <ChevronLeft /> Sebelumnya
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === pageCount} aria-label="Halaman berikutnya">
          Berikutnya <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
