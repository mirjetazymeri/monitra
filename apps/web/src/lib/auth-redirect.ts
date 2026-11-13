import { mutate } from "swr";

const DEFAULT_DESTINATION = "/overview";

/**
 * Only same-origin, absolute in-app paths are accepted as a post-login destination.
 * Rejects protocol-relative ("//evil.com"), backslash ("/\evil.com"), absolute URLs
 * and the login page itself, so `?next=` can never become an open redirect.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n\t]/.test(next)) {
    return DEFAULT_DESTINATION;
  }
  if (next === "/" || next.startsWith("/login")) return DEFAULT_DESTINATION;
  return next;
}

/** Login URL that returns the user to the page they were on. */
export function loginPathFor(current: string): string {
  const next = safeNextPath(current);
  return next === DEFAULT_DESTINATION ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}

/** Drops every cached API response so no data from an ended session is shown to the next user. */
export function clearCachedData(): Promise<unknown> {
  return mutate(() => true, undefined, { revalidate: false });
}
