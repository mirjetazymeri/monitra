import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Tone = "primary" | "success" | "destructive" | "warning" | "cyan";

const TONES: Record<Tone, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  destructive: "bg-destructive/12 text-destructive",
  warning: "bg-warning/12 text-warning",
  cyan: "bg-cyan/12 text-cyan",
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
}

export function KpiCard({ label, value, hint, icon: Icon, tone = "primary", loading }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : (
        <div>
          <div className="metric text-[28px] leading-none font-bold text-foreground">{value}</div>
          {hint && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
      )}
    </div>
  );
}
