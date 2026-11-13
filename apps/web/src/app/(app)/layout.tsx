"use client";

import { AppProviders } from "@/components/providers/app-providers";
import { AuthGuard } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AppProviders>
  );
}
