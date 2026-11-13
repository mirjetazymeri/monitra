"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useEndpoints, useIncidents } from "@/hooks/use-monitraz";
import { Panel } from "@/components/common/panel";
import { NativeSelect } from "@/components/common/native-select";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { RowsSkeleton } from "@/components/common/section-skeleton";
import { Pagination } from "@/components/common/pagination";
import { IncidentsTable } from "@/components/incidents/incidents-table";

/** Re-mounts the view when `?endpoint=` changes, so client-side navigation applies the new filter. */
function IncidentsRoute() {
  const searchParams = useSearchParams();
  const param = searchParams.get("endpoint") ?? "";
  const initialEndpoint = /^[1-9]\d*$/.test(param) ? Number(param) : null;

  return <IncidentsView key={param} initialEndpoint={initialEndpoint} />;
}

function IncidentsView({ initialEndpoint }: { initialEndpoint: number | null }) {
  const [state, setState] = useState("");
  const [endpointId, setEndpointId] = useState<number | null>(initialEndpoint);
  const [page, setPage] = useState(1);

  const endpoints = useEndpoints();
  const incidents = useIncidents({ state: state || undefined, endpoint_id: endpointId, page, per_page: 20 });
  const openCount = incidents.data?.data.filter((incident) => incident.state === "open").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 sm:w-[28rem]">
          <NativeSelect
            aria-label="Filter by state"
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All incidents</option>
            <option value="open">Ongoing</option>
            <option value="resolved">Resolved</option>
          </NativeSelect>
          <NativeSelect
            aria-label="Filter by endpoint"
            value={endpointId ?? ""}
            onChange={(event) => {
              setEndpointId(event.target.value ? Number(event.target.value) : null);
              setPage(1);
            }}
          >
            <option value="">All endpoints</option>
            {endpoints.data?.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        {incidents.data && page === 1 && !state && (
          <p className="text-sm text-muted-foreground">
            {openCount > 0 ? (
              <span className="text-destructive">{openCount} ongoing</span>
            ) : (
              <span className="text-success">No ongoing incidents</span>
            )}
          </p>
        )}
      </div>

      <Panel className="overflow-hidden">
        {incidents.data ? (
          incidents.data.data.length > 0 ? (
            <>
              <IncidentsTable incidents={incidents.data.data} />
              <Pagination meta={incidents.data.meta} onPageChange={setPage} noun="incidents" />
            </>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No incidents"
              description="An incident opens when a healthy endpoint starts failing, and resolves on the next successful check."
            />
          )
        ) : incidents.error ? (
          <ErrorState description={incidents.error.message} onRetry={() => incidents.mutate()} />
        ) : (
          <RowsSkeleton rows={6} />
        )}
      </Panel>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<RowsSkeleton rows={6} />}>
      <IncidentsRoute />
    </Suspense>
  );
}
