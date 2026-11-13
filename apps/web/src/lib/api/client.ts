/**
 * Minimal typed HTTP client for the Laravel API.
 *
 * Authentication uses Laravel Sanctum's cookie-based SPA flow:
 *  1. GET /sanctum/csrf-cookie sets the XSRF-TOKEN cookie.
 *  2. Mutations echo it back in the X-XSRF-TOKEN header.
 *  3. The HttpOnly session cookie is sent with `credentials: "include"`.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: ValidationErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && readCookie("XSRF-TOKEN")) return;
  await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include", headers: { Accept: "application/json" } });
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const xsrf = readCookie("XSRF-TOKEN");
  if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isMutation = (options.method ?? "GET") !== "GET";
  let response: Response;

  try {
    if (isMutation) await ensureCsrfCookie();
    response = await send(path, options);

    // 419 = CSRF token mismatch (e.g. expired session): refresh the token once and retry.
    if (response.status === 419 && isMutation) {
      await ensureCsrfCookie(true);
      response = await send(path, options);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Unable to reach the MonitraZ API. Is the backend running?", 0);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; errors?: ValidationErrors };
    const message =
      response.status === 429
        ? "Too many requests. Please wait a moment and try again."
        : response.status >= 500
          ? "The server encountered an error. Please try again."
          : (data.message ?? `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, data.errors ?? {});
  }

  return payload as T;
}

/** SWR fetcher: keys are API paths (including query strings). */
export const swrFetcher = <T,>(path: string): Promise<T> => apiRequest<T>(path);
