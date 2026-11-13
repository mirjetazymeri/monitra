import { cn } from "@/lib/utils";

/** Base surface used for every dashboard section. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-border bg-card shadow-card", className)} {...props} />;
}

interface PanelHeaderProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, description, action, className }: PanelHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
