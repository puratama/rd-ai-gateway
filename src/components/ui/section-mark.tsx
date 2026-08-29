import { cn } from "@/lib/utils";

/* Label seksi bernomor: badge angka primary + label uppercase */
function SectionMark({
  no,
  label,
  className,
}: {
  no: string;
  label: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors",
        className
      )}
    >
      <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-xs font-bold tracking-normal text-primary">
        {no}
      </span>
      <span className="ml-2.5">{label}</span>
    </p>
  );
}

export { SectionMark };
