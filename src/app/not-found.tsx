import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl bg-card p-8 text-center ring-1 ring-border/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <span className="text-2xl font-bold text-primary">404</span>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Halaman yang Anda cari mungkin telah dipindahkan atau tidak lagi
          tersedia.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
