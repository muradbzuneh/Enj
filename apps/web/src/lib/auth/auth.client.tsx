import { createAuthClient } from "better-auth/react";

// The API is proxied through the same origin in production, so the auth client
// must talk to the page origin as well (not to an absolute API host).
const baseURL =
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://localhost:4001";

export const authClient = createAuthClient({
  baseURL,
});