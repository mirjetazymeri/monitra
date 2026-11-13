"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-monitra";
import { ApiError } from "@/lib/api/client";
import { loginPathFor } from "@/lib/auth-redirect";
import { authApi } from "@/lib/api/services";
import type { User } from "@/lib/api/types";
import { FullPageLoader } from "@/components/common/full-page-loader";
import { ErrorState } from "@/components/common/error-state";

interface AuthContextValue {
  user: User;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthGuard>.");
  return context;
}

/** Renders children only for an authenticated session. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data, error, isLoading, mutate: reload } = useCurrentUser();

  const unauthenticated = error instanceof ApiError && error.isUnauthenticated;

  useEffect(() => {
    if (unauthenticated) router.replace(loginPathFor(window.location.pathname + window.location.search));
  }, [unauthenticated, router]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      toast.error("Sign-out failed. Please try again.");
      return;
    }
    // Drop every cached response so no data survives the session.
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/login");
  }, [mutate, router]);

  const value = useMemo(() => (data ? { user: data.user, logout } : null), [data, logout]);

  if (value) return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

  if (error && !unauthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <ErrorState
          title="Cannot reach Monitra"
          description={error instanceof ApiError ? error.message : "Unexpected error while loading your session."}
          onRetry={() => reload()}
        />
      </div>
    );
  }

  return <FullPageLoader label={isLoading ? "Loading your workspace…" : "Redirecting to sign in…"} />;
}
