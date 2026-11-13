"use client";

import { useRouter } from "next/navigation";
import { SWRConfig } from "swr";
import { ApiError, swrFetcher } from "@/lib/api/client";

/**
 * Global data-fetching configuration. Any 401 from the API means the session
 * expired, so the user is sent back to the login page.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        errorRetryCount: 2,
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.isUnauthenticated) router.replace("/login");
        },
        shouldRetryOnError: (error: unknown) => !(error instanceof ApiError && error.status > 0 && error.status < 500),
      }}
    >
      {children}
    </SWRConfig>
  );
}
