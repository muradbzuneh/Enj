import { createServer } from "http";
import cors from "cors";
import { app } from "./app.js";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";

const authHandler = toNodeHandler(auth);

/**
 * Single CORS implementation for the whole API.
 *
 * `app.ts` mounts the same middleware for regular API routes, but `/api/auth/*`
 * is served by the BetterAuth handler before Express runs, so it needs the
 * middleware applied explicitly here.
 *
 * The origin is echoed back (never hardcoded) so the same deployment can serve
 * the local dev server, the Vercel frontend and any other allowed origin.
 * `Vary: Origin` prevents caches from serving a stale origin to another client.
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
});

const server = createServer(async (req, res) => {
  try {
    const url = req.url || "";

    if (url.startsWith("/api/auth")) {
      corsMiddleware(req, res, () => {
        authHandler(req, res).catch((err) => {
          console.error("Auth handler error:", err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "error", message: "Internal server error" }));
          }
        });
      });
    } else {
      app(req, res);
    }
  } catch (err) {
    console.error("Request handler error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Internal server error" }));
    }
  }
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const port = Number(process.env.PORT || 4001);

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
