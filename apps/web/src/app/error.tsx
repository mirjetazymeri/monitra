"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ErrorState } from "@/components/common/error-state";

/** Fallback for rendering errors outside the dashboard shell (e.g. the sign-in page). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <ErrorState title="Something went wrong" description="An unexpected error occurred. Please try again." onRetry={reset} />
      <Link href="/overview" className="mt-2 text-sm font-medium text-primary hover:underline">
        Back to overview
      </Link>
    </main>
  );
}
