"use client";

import { useEffect, useState } from "react";

/** Current timestamp, refreshed periodically so relative times ("2 minutes ago") stay accurate. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
