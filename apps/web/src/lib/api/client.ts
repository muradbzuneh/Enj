import { ApiRequestError, messageForStatus } from "./errors";

/**
 * Base URL of the Express backend.
 *
 * In production the API is proxied through the same origin (see vercel.json),
 * so every request is first-party: no CORS preflight, no cross-site cookie
 * rules and a stale VITE_API_URL can never break the app.
 *
 * Locally we talk to the API directly, which is still same-site because
 * localhost:3000 and localhost:4001 share the same registrable domain.
 */
const isLocalDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const configuredUrl = import.meta.env["VITE_API_URL"]?.trim();

export const DEFAULT_API_URL = "https://enj-fd0ec6a0ffca.herokuapp.com";

/**
 * Same-origin everywhere. `VITE_API_URL` is only honoured when it is set
 * explicitly for local development - in production the API is proxied through
 * the app's own origin (vercel.json / vite.config.ts).
 */
export let API_BASE_URL: string = isLocalDev && configuredUrl
  ? configuredUrl.replace(/\/$/, "")
  : "";

/**
 * Probe the configured host and fall back to the known production API if it
 * does not answer. Only relevant when the API is called cross-origin - the
 * same-origin proxy can never be stale.
 */
async function probeApiBaseUrl(): Promise<string> {
  if (!API_BASE_URL) return API_BASE_URL;
  if (API_BASE_URL === DEFAULT_API_URL) return API_BASE_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (res.ok) return API_BASE_URL;
  } catch {
    // unreachable or blocked - fall through to the default
  }

  console.warn(
    `[api] ${API_BASE_URL} is unreachable - falling back to ${DEFAULT_API_URL}`,
  );
  API_BASE_URL = DEFAULT_API_URL;
  return API_BASE_URL;
}

/**
 * Every request must wait for the probe to finish, otherwise requests fired in
 * parallel with the probe (feed, stories, ...) would still use the stale host.
 */
let resolution: Promise<string> | null = null;

export function ensureApiBaseUrl(): Promise<string> {
  if (!resolution) resolution = probeApiBaseUrl();
  return resolution;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: Query): string {
  // Same-origin (production proxy) or absolute (local dev).
  const url = API_BASE_URL
    ? new URL(`${API_BASE_URL}${path}`)
    : new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function extractFieldErrors(payload: unknown): Record<string, string> | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const raw = record["fieldErrors"] ?? record["errors"];
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }
  return Object.keys(out).length ? out : undefined;
}

function extractMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const candidate = record["message"] ?? record["error"];
  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;

  // Never hit the network before the API base URL is known to be reachable.
  await ensureApiBaseUrl();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      // Better Auth uses cookie sessions — always send credentials.
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch {
    throw new ApiRequestError({
      status: 0,
      code: "network_error",
      message: "Can't reach the server. Check your connection and try again.",
    });
  }

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError({
      status: response.status,
      message: extractMessage(payload) ?? messageForStatus(response.status, path),
      ...(extractFieldErrors(payload) ? { fieldErrors: extractFieldErrors(payload)! } : {}),
    });
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

export const apiClient = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    http.get<T>(path, params ? { query: params } : undefined),
  post: <T>(path: string, body?: unknown) => http.post<T>(path, body),
  patch: <T>(path: string, body?: unknown) => http.patch<T>(path, body),
  put: <T>(path: string, body?: unknown) => http.put<T>(path, body),
  delete: <T>(path: string, params?: Record<string, unknown>) =>
    http.delete<T>(path, params ? { query: params } : undefined),
};

/**
 * Backends differ on envelopes ({ data }, { post }, bare object).
 * unwrap() keeps that tolerance in one place instead of in every component.
 */
export function unwrap<T>(payload: unknown, key?: string): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if (key && record[key] !== undefined) return record[key] as T;
    if (record["data"] !== undefined) return record["data"] as T;
  }
  return payload as T;
}
