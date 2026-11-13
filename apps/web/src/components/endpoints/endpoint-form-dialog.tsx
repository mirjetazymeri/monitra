"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/common/native-select";
import { ApiError } from "@/lib/api/client";
import { endpointsApi } from "@/lib/api/services";
import type { Endpoint, EndpointInput } from "@/lib/api/types";
import { formatInterval } from "@/lib/format";
import { useRefreshAll } from "@/hooks/use-monitraz";

export const CHECK_INTERVALS = [60, 300, 600, 900, 1800, 3600] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120, "Name may not exceed 120 characters."),
  url: z
    .string()
    .trim()
    .max(2048, "URL is too long.")
    .url("Enter a valid URL, including https://")
    .refine((value) => /^https?:\/\//i.test(value), "Only http:// and https:// URLs are supported."),
  expected_status: z
    .number({ error: "Enter a status code." })
    .int()
    .min(100, "Must be between 100 and 599.")
    .max(599, "Must be between 100 and 599."),
  check_interval: z.number().refine((value) => (CHECK_INTERVALS as readonly number[]).includes(value), "Choose an interval."),
  is_enabled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = { name: "", url: "https://", expected_status: 200, check_interval: 300, is_enabled: true };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: Endpoint | null;
  onSaved?: (endpoint: Endpoint) => void;
}

export function EndpointFormDialog({ open, onOpenChange, endpoint, onSaved }: Props) {
  const refreshAll = useRefreshAll();
  const isEdit = Boolean(endpoint);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      endpoint
        ? {
            name: endpoint.name,
            url: endpoint.url,
            expected_status: endpoint.expected_status,
            check_interval: endpoint.check_interval,
            is_enabled: endpoint.is_enabled,
          }
        : DEFAULTS,
    );
  }, [open, endpoint, reset]);

  async function onSubmit(values: FormValues) {
    const input: EndpointInput = values;
    try {
      const saved = endpoint ? await endpointsApi.update(endpoint.id, input) : await endpointsApi.create(input);
      toast.success(isEdit ? "Endpoint updated" : "Endpoint created", {
        description: isEdit ? saved.name : `${saved.name} will be checked by the scheduler shortly.`,
      });
      await refreshAll();
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          if (field in DEFAULTS) setError(field as keyof FormValues, { message: messages[0] });
        });
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Could not save the endpoint.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="border border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{isEdit ? "Edit endpoint" : "Add endpoint"}</DialogTitle>
          <DialogDescription>
            MonitraZ sends a GET request without following redirects. Only public destinations are allowed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <Field id="name" label="Service name" error={errors.name?.message}>
            <Input id="name" placeholder="Payments API" autoComplete="off" aria-invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <Field id="url" label="Endpoint URL" error={errors.url?.message} hint="http(s) only · ports 80, 443, 8080, 8443">
            <Input
              id="url"
              type="url"
              inputMode="url"
              placeholder="https://api.example.com/health"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.url)}
              {...register("url")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="expected_status" label="Expected status" error={errors.expected_status?.message}>
              <Input
                id="expected_status"
                type="number"
                min={100}
                max={599}
                inputMode="numeric"
                aria-invalid={Boolean(errors.expected_status)}
                {...register("expected_status", { valueAsNumber: true })}
              />
            </Field>
            <Field id="check_interval" label="Check interval" error={errors.check_interval?.message}>
              <NativeSelect id="check_interval" {...register("check_interval", { setValueAs: (v: string) => Number(v) })}>
                {CHECK_INTERVALS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    Every {formatInterval(seconds)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Controller
            control={control}
            name="is_enabled"
            render={({ field }) => (
              <label htmlFor="is_enabled" className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/50 px-3.5 py-3">
                <span>
                  <span className="block text-sm font-medium text-foreground">Monitoring enabled</span>
                  <span className="block text-xs text-muted-foreground">Disabled endpoints keep their history but are not checked.</span>
                </span>
                <Switch id="is_enabled" checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
              </label>
            )}
          />

          <DialogFooter className="mt-1 -mx-4 -mb-4 border-t border-border bg-background/40 px-4 py-3">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Validating…" : isEdit ? "Save changes" : "Create endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-subtle-foreground">{hint}</p>
      )}
    </div>
  );
}
