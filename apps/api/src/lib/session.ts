import type { Request } from "express";

import { auth } from "./auth.js";

export async function getSession(request: Request) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  return auth.api.getSession({ headers });
}

/**
 * The raw session token of the current request (the value of the session
 * cookie). The realtime layer uses it to authenticate the socket handshake,
 * because the socket is opened from another origin and therefore does not
 * receive the cookie.
 */
export function getSessionToken(request: Request): string | null {
  const raw = request.headers.cookie;
  if (!raw) return null;

  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (
      (name === "__Secure-better-auth.session_token" ||
        name === "better-auth.session_token") &&
      rest.length
    ) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
