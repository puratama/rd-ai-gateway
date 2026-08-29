import * as React from "react"

import { cn } from "@/lib/utils"

function FormSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-3", className)}>
      <div className="h-5 w-0.5 rounded-full bg-primary/60" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
    </div>
  )
}

function FormPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-4", className)}>
      {children}
    </div>
  )
}

export { FormSection, FormPanel }
