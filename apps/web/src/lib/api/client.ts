import { ApiRequestError, messageForStatus } from "./errors";

/**
 * Base URL of the existing Express backend.
 * Configure with VITE_API_URL (see .env.example). Never hardcode a host.
 * `||` (not `??`) so an empty VITE_API_URL still falls back to the default.
 */
export const API_BASE_URL: string = (
  import.meta.env["VITE_API_URL"] || "https://enj-fd0ec6a0ffca.herokuapp.com"
).replace(/\/$/, "");

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}${path}`);
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
