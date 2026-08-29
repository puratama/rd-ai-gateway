import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative flex gap-3 rounded-xl border p-4 text-sm ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "border-border/60 bg-card text-card-foreground ring-border/30",
        info: "border-info/30 bg-info/10 text-info ring-info/15",
        success: "border-success/30 bg-success/10 text-success ring-success/15",
        warning: "border-warning/30 bg-warning/10 text-warning ring-warning/15",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive ring-destructive/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const alertIcon: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, React.ComponentType<{ className?: string }>> = {
  default: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  destructive: CircleAlert,
}

interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  title?: string
  hideIcon?: boolean
}

function Alert({
  className,
  variant = "default",
  title,
  hideIcon = false,
  children,
  ...props
}: AlertProps) {
  const Icon = alertIcon[variant ?? "default"]
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="space-y-1">
        {title && <p className="font-semibold leading-none tracking-tight">{title}</p>}
        {children && <div className="text-sm/relaxed opacity-90">{children}</div>}
      </div>
    </div>
  )
}

export { Alert, alertVariants }
