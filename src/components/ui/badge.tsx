import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-transparent text-xs font-medium transition-colors [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/20",
        secondary: "bg-muted text-muted-foreground ring-1 ring-inset ring-border/40",
        outline: "border-border text-foreground",
        success: "bg-success/15 text-success ring-1 ring-inset ring-success/20",
        warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/20",
        destructive: "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/20",
        info: "bg-info/15 text-info ring-1 ring-inset ring-info/20",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
