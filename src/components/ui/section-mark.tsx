import { cn } from "@/lib/utils";

/* Label seksi: badge label uppercase */
function SectionMark({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
        className
      )}
    >
      {label}
    </p>
  );
}

export { SectionMark };
