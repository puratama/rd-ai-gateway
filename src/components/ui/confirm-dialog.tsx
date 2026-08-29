"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Label tombol konfirmasi (aksi berbahaya). Boleh menyertakan ikon. */
  confirmLabel?: React.ReactNode
  /** Label tombol batal. Default: "Cancel". */
  cancelLabel?: React.ReactNode
  onConfirm: () => void
  /** Ikon di dalam badge `bg-destructive/10`. Default: AlertTriangle. */
  icon?: React.ReactNode
  /** Kelas tambahan untuk `DialogContent` (default `sm:max-w-sm`). */
  className?: string
  showCloseButton?: boolean
}

/**
 * Modal konfirmasi destructive dengan struktur eksplisit header / body / footer.
 * Menggantikan pola inline Dialog + DialogContent + div header/footer manual
 * pada semua modal delete/confirm di admin.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  icon,
  className,
  showCloseButton = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-sm", className)}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-6 py-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            {icon ?? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
          <div className="min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-0.5 text-xs">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        <DialogFooter className="border-t border-border bg-muted/50 px-6 py-4">
          <DialogClose render={<Button variant="outline">{cancelLabel}</Button>} />
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
