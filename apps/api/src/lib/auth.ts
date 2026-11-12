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
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:4001",
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me",
});