"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Loader2, LockKeyhole, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { ApiError, apiRequest } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import type { User } from "@/lib/api/types";
import { clearCachedData, safeNextPath } from "@/lib/auth-redirect";

/** Where to go after signing in: the validated ?next= path, or the overview. Read at call time (no useSearchParams, so the page stays static). */
function nextDestination(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  { icon: Activity, title: "Real HTTP health checks", text: "Status codes and response times measured from the server, on a schedule." },
  { icon: Timer, title: "History you can trust", text: "Every check is persisted. Uptime is computed only from recorded results." },
  { icon: ShieldCheck, title: "Secure by default", text: "Session auth, CSRF protection and SSRF-hardened outbound requests." },
];

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", remember: true } });

  // Arriving here means there is no valid session (sign-out or expiry): purge any cached
  // API data so nothing from a previous session can flash for the next user.
  // Then, if a session does exist after all, go straight to the dashboard.
  useEffect(() => {
    void clearCachedData();
    apiRequest<{ user: User }>("/api/auth/user")
      .then(() => router.replace(nextDestination()))
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await authApi.login(values.email, values.password, values.remember);
      router.replace(nextDestination());
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setFormError(error.errors.email?.[0] ?? error.errors.password?.[0] ?? error.message);
      } else {
        setFormError(error instanceof ApiError ? error.message : "Sign-in failed. Please try again.");
      }
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgb(148 163 184 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(148 163 184 / 0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)",
          }}
        />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <h1 className="text-4xl leading-tight font-extrabold text-foreground">
            Monitor your infrastructure.
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan bg-clip-text text-transparent">Stay in control.</span>
          </h1>
          <ul className="mt-10 space-y-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <feature.icon className="size-5" />
                </span>
                <div>
                  <p className="font-heading font-semibold text-foreground">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-subtle-foreground">Open-source infrastructure & API monitoring.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Access your monitoring workspace.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            {formError && (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] text-muted-foreground">
                Email
              </Label>
              <Input id="email" type="email" autoComplete="email" className="h-10 bg-card" aria-invalid={Boolean(errors.email)} {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-10 bg-card"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
              <input type="checkbox" className="size-4 rounded border-input accent-primary" {...register("remember")} />
              Keep me signed in
            </label>

            <Button type="submit" size="lg" className="h-10 w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
