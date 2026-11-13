"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Activity, Plus, Search, SearchX } from "lucide-react";
import { useEndpoints } from "@/hooks/use-monitra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/common/panel";
import { NativeSelect } from "@/components/common/native-select";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { RowsSkeleton } from "@/components/common/section-skeleton";
import { EndpointsTable } from "@/components/endpoints/endpoints-table";
import { EndpointFormDialog } from "@/components/endpoints/endpoint-form-dialog";

export default function EndpointsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  // Debounced: the API is queried once typing pauses, not on every keystroke.
  const deferredSearch = useDebouncedValue(search.trim(), 300);
  const { data, error, mutate, isValidating } = useEndpoints({ search: deferredSearch || undefined, status: status || undefined });

  const filtered = Boolean(deferredSearch || status);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or URL"
              aria-label="Search endpoints"
              className="h-9 bg-card pl-9"
            />
          </div>
          <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="sm:w-44">
            <option value="">All statuses</option>
            <option value="up">Online</option>
            <option value="down">Offline</option>
            <option value="pending">Pending</option>
            <option value="paused">Paused</option>
          </NativeSelect>
        </div>
        <Button size="lg" onClick={() => setCreating(true)} className="h-9 px-3.5">
          <Plus />
          Add endpoint
        </Button>
      </div>

      <Panel className="overflow-hidden" aria-busy={isValidating}>
        {data ? (
          data.length > 0 ? (
            <EndpointsTable endpoints={data} />
          ) : filtered ? (
            <EmptyState icon={SearchX} title="No matching endpoints" description="Try a different search term or status filter." />
          ) : (
            <EmptyState
              icon={Activity}
              title="No endpoints yet"
              description="Register an HTTP or HTTPS service to start recording its availability and response time."
              action={
                <Button size="lg" onClick={() => setCreating(true)}>
                  <Plus />
                  Add your first endpoint
                </Button>
              }
            />
          )
        ) : error ? (
          <ErrorState description={error.message} onRetry={() => mutate()} />
        ) : (
          <RowsSkeleton rows={6} />
        )}
      </Panel>

      {data && data.length > 0 && (
        <p className="text-xs text-subtle-foreground">
          {data.length} endpoint{data.length === 1 ? "" : "s"} · Uptime is observed availability computed from checks recorded in the last 24 hours.
        </p>
      )}

      <EndpointFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
