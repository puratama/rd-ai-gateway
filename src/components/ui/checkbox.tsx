import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  checked,
  ...props
}: React.ComponentProps<"button"> & {
  checked?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked ?? false}
      data-slot="checkbox"
      className={cn(
        "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-border bg-background text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "hover:bg-muted",
        className
      )}
      {...props}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  )
}

export { Checkbox }
