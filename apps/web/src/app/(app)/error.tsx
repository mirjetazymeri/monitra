"use client";

import { useEffect } from "react";
import { Panel } from "@/components/common/panel";
import { ErrorState } from "@/components/common/error-state";

/** Catches rendering errors on dashboard pages; the sidebar and header stay usable. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <ErrorState
        title="This page failed to load"
        description="An unexpected error occurred while rendering this view. Your data is unaffected."
        onRetry={reset}
      />
    </Panel>
  );
}
