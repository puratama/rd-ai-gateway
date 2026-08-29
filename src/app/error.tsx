"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl bg-card p-8 text-center ring-1 ring-border/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Terjadi kesalahan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Maaf, sesuatu yang tidak terduga telah terjadi. Silakan coba lagi.
        </p>
        <button
          onClick={reset}
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
}
