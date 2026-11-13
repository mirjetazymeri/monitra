"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { endpointsApi } from "@/lib/api/services";
import type { Endpoint } from "@/lib/api/types";
import { formatMs } from "@/lib/format";
import { useRefreshAll } from "@/hooks/use-monitra";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Endpoint mutations shared by the table and detail views. Updates are not
 * optimistic: the UI only changes after the API confirms the result.
 */
export function useEndpointActions() {
  const refreshAll = useRefreshAll();
  const { mutate } = useSWRConfig();
  const [busy, setBusy] = useState<Record<number, "check" | "toggle" | "delete" | undefined>>({});

  function track(id: number, action: "check" | "toggle" | "delete" | undefined) {
    setBusy((current) => ({ ...current, [id]: action }));
  }

  async function runCheck(endpoint: Endpoint) {
    track(endpoint.id, "check");
    try {
      const result = await endpointsApi.check(endpoint.id);
      if (result.is_success) {
        toast.success(`${endpoint.name} is online`, { description: `HTTP ${result.status_code} in ${formatMs(result.response_time_ms)}` });
      } else {
        toast.error(`${endpoint.name} check failed`, {
          description: [result.error_label, result.status_code ? `HTTP ${result.status_code}` : null].filter(Boolean).join(" · "),
        });
      }
      await refreshAll();
    } catch (error) {
      toast.error(errorMessage(error, "The check could not be run."));
    } finally {
      track(endpoint.id, undefined);
    }
  }

  async function toggle(endpoint: Endpoint) {
    track(endpoint.id, "toggle");
    try {
      await endpointsApi.setEnabled(endpoint.id, !endpoint.is_enabled);
      toast.success(endpoint.is_enabled ? `Monitoring paused for ${endpoint.name}` : `Monitoring resumed for ${endpoint.name}`);
      await refreshAll();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the endpoint."));
    } finally {
      track(endpoint.id, undefined);
    }
  }

  async function remove(endpoint: Endpoint, options: { skipOwnQueries?: boolean } = {}): Promise<boolean> {
    track(endpoint.id, "delete");
    try {
      await endpointsApi.remove(endpoint.id);
      toast.success(`${endpoint.name} deleted`, { description: "Its check history and incidents were removed." });
      if (options.skipOwnQueries) {
        // Refresh lists and dashboards, but not the deleted endpoint's own queries (they would 404).
        const path = `/api/endpoints/${endpoint.id}`;
        const own = (k: string) =>
          k === path || k.startsWith(`${path}/`) || k.startsWith(`${path}?`) || new URLSearchParams(k.split("?")[1] ?? "").get("endpoint_id") === String(endpoint.id);
        await mutate((k) => typeof k === "string" && k.startsWith("/api/") && k !== "/api/auth/user" && !own(k));
      } else {
        await refreshAll();
      }
      return true;
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the endpoint."));
      return false;
    } finally {
      track(endpoint.id, undefined);
    }
  }

  return { busy, runCheck, toggle, remove };
}
