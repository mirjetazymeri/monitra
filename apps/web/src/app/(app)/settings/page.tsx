"use client";

import { useState } from "react";
import { FlaskConical, Loader2, LogOut, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { useDashboard, useMonitoringSettings, useRefreshAll } from "@/hooks/use-monitra";
import { settingsApi } from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";
import { formatBytes, formatDateTime, formatInterval } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Panel, PanelHeader } from "@/components/common/panel";
import { RowsSkeleton } from "@/components/common/section-skeleton";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const settings = useMonitoringSettings();
  const dashboard = useDashboard("24h");
  const refreshAll = useRefreshAll();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function removeDemoData() {
    setRemoving(true);
    try {
      const { deleted_endpoints } = await settingsApi.removeDemoData();
      toast.success("Demo data removed", { description: `${deleted_endpoints} demo endpoint(s) and their simulated history were deleted.` });
      setConfirming(false);
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove demo data.");
    } finally {
      setRemoving(false);
    }
  }

  const s = settings.data;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel>
        <PanelHeader title="Account" description="Your Monitra identity" action={<UserIcon className="size-4 text-subtle-foreground" />} />
        <dl className="divide-y divide-border px-5 pt-2">
          <Row label="Name">{user.name}</Row>
          <Row label="Email">{user.email}</Row>
          <Row label="Member since">{formatDateTime(user.created_at)}</Row>
        </dl>
        <div className="flex justify-end border-t border-border px-5 py-4">
          <Button variant="outline" size="lg" onClick={() => void logout()}>
            <LogOut />
            Sign out
          </Button>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Monitoring policy"
          description="Enforced by the server for every check (read-only)"
          action={<ShieldCheck className="size-4 text-success" />}
        />
        {s ? (
          <dl className="divide-y divide-border px-5 pt-2 pb-2">
            <Row label="Request">
              <span className="font-mono">{s.http_method}</span> · redirects {s.follows_redirects ? "followed" : "not followed"}
            </Row>
            <Row label="Timeouts">
              {s.connect_timeout_seconds}s connect · {s.request_timeout_seconds}s total
            </Row>
            <Row label="Max response size">{formatBytes(s.max_response_bytes)}</Row>
            <Row label="Allowed ports">
              <span className="font-mono">{s.allowed_ports.join(", ")}</span>
            </Row>
            <Row label="Check intervals">{s.allowed_intervals.map(formatInterval).join(" · ")}</Row>
            <Row label="Destinations">Public IPs only (private, loopback, link-local & metadata ranges blocked)</Row>
            <Row label="Scheduler batch">{s.scheduler_batch_size} endpoints per minute</Row>
            <Row label="Endpoint limit">{s.max_endpoints_per_user} live endpoints per account</Row>
            <Row label="History retention">{s.retention_days} days</Row>
          </dl>
        ) : (
          <RowsSkeleton rows={5} />
        )}
      </Panel>

      <Panel className="xl:col-span-2">
        <PanelHeader title="Demo data" description="Simulated endpoints seeded for local evaluation" action={<FlaskConical className="size-4 text-cyan" />} />
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Demo endpoints use reserved <span className="font-mono text-foreground">.example</span> domains. Their history is generated, flagged as simulated, and they are never checked live. Removing them keeps your live endpoints and their real history untouched.
          </p>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setConfirming(true)}
            disabled={!dashboard.data?.includes_demo_data}
            className="shrink-0"
          >
            <Trash2 />
            {dashboard.data && !dashboard.data.includes_demo_data ? "No demo data" : "Remove demo data"}
          </Button>
        </div>
      </Panel>

      <AlertDialog open={confirming} onOpenChange={(open) => !removing && setConfirming(open)}>
        <AlertDialogContent className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Remove all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              Every demo endpoint and its simulated checks and incidents will be deleted. Live endpoints are not affected. Re-run the seeder to restore it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <Button variant="danger" onClick={() => void removeDemoData()} disabled={removing}>
              {removing && <Loader2 className="animate-spin" />}
              Remove demo data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
