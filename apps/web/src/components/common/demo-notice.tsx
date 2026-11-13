import Link from "next/link";
import { FlaskConical } from "lucide-react";
import type { DataSource } from "@/lib/api/types";

export function DemoNotice({ source }: { source: DataSource }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-cyan/20 bg-cyan/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-muted-foreground">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden="true" />
        {source === "live" ? (
          <span>
            Figures below are <span className="font-medium text-foreground">live measurements only</span>. This workspace also has simulated demo
            endpoints (marked <span className="font-semibold text-cyan">DEMO</span>). Choose <span className="text-foreground">Include demo</span> to preview them.
          </span>
        ) : (
          <span>
            Figures below <span className="font-medium text-foreground">include simulated demo data</span> (marked{" "}
            <span className="font-semibold text-cyan">DEMO</span>). Its history is generated, never measured.
          </span>
        )}
      </p>
      <Link href="/settings" className="shrink-0 text-xs font-medium text-cyan hover:underline">
        Manage demo data
      </Link>
    </div>
  );
}
