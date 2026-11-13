import { cn } from "@/lib/utils";

/** Monitra brand mark: a pulse line inside a rounded square. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan text-white shadow-[0_6px_16px_-6px_rgb(59_130_246/0.7)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
      </svg>
    </span>
  );
}

export function Logo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && <span className="font-heading text-lg font-bold tracking-tight text-foreground">Monitra</span>}
    </span>
  );
}
