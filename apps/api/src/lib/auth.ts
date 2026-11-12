import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./prisma.js";

/**
 * FRONTEND_URL may hold a comma separated list of allowed origins, e.g.
 * "http://localhost:3000,https://enj.example.com". The API origin itself is
 * always trusted so the auth callbacks work.
 */
const trustedOrigins = Array.from(
  new Set(
    [
      ...(process.env.FRONTEND_URL || "http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      process.env.BETTER_AUTH_URL || "http://localhost:4001",
    ].filter(Boolean),
  ),
);

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:4001";
const isSecure = baseURL.startsWith("https://");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        unique: false,
      },
      bio: {
        type: "string",
        required: false,
      },
    },
  },

  trustedOrigins,
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me",

  advanced: {
    useSecureCookies: isSecure,
    /**
     * The frontend and the API are served from different sites
     * (vercel.app vs herokuapp.com), so the browser only sends the session
     * cookie on cross-site fetches when it is SameSite=None.
     * `Secure` is mandatory for SameSite=None.
     */
    defaultCookieAttributes: isSecure
      ? { sameSite: "none", secure: true, httpOnly: true, path: "/" }
      : { sameSite: "lax", httpOnly: true, path: "/" },
  },
});