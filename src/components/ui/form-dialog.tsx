"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Ikon di dalam badge `bg-primary/10` sebelum judul. */
  icon?: React.ReactNode
  /** Konten footer (tombol aksi). Di-render dengan padding flush `bg-muted/50`. */
  footer?: React.ReactNode
  children: React.ReactNode
  /** Kelas tambahan untuk `DialogContent` (mis. `sm:max-w-2xl`). */
  className?: string
  /** Kelas tambahan untuk area body scrollable. */
  bodyClassName?: string
  showCloseButton?: boolean
}

/**
 * Modal dialog standar dengan struktur eksplisit header / body / footer.
 * Menggantikan pola inline Dialog + DialogContent + div header/footer manual.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  footer,
  children,
  className,
  bodyClassName,
  showCloseButton = true,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-2xl", className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-6 py-4">
          {icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <DialogTitle className="text-base">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-0.5 text-xs">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <DialogBody className={cn("max-h-[70vh]", bodyClassName)}>
          {children}
        </DialogBody>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
