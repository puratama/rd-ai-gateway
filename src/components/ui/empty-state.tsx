import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("ring-0 border border-dashed border-border/50 bg-transparent", className)}>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="relative">
          <span className="absolute inset-0 -z-10 scale-125 rounded-full bg-primary/10 blur-xl" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
            <Icon className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export { EmptyState };