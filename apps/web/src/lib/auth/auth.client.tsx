import { createAuthClient } from "better-auth/react";

// `||` (not `??`) so an empty VITE_API_URL still falls back to the default.
export const authClient = createAuthClient({
  baseURL:
    import.meta.env["VITE_API_URL"] || "https://enj-fd0ec6a0ffca.herokuapp.com",
});