import cors from "cors";
import { getSession } from "./lib/session.js";
import express from "express";
import { commentRouter } from "./routes/comment.routes.js";
import { likeRouter } from "./routes/like.routes.js";
import { postRouter } from "./routes/post.routes.js";
import { prisma } from "./lib/prisma.js";
import { profileRouter } from "./routes/profile.routes.js";
import { feedRouter } from "./routes/feed.routes.js";
import { followRouter } from "./routes/follow.routes.js";
import { storyRouter } from "./routes/story.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { storyReactionRouter } from "./routes/story-reaction.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { messageRouter } from "./routes/message.routes.js";
import { exploreRouter } from "./routes/explore.routes.js";
import { bookmarkRouter } from "./routes/bookmark.routes.js";
import { presenceRouter } from "./routes/presence.routes.js";
import path from "path";
import fs from "fs";
export const app = express();

/**
 * Uploads live in <api-root>/uploads. The folder is git-ignored, so on Heroku
 * (ephemeral filesystem) it may not exist yet - create it before serving.
 */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/me", async (req, res) => {
  try {
    const session = await getSession(req);

    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    return res.json({
      status: "ok",
      user: session.user,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    });
  } catch (error) {
    console.error("ME ROUTE ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to retrieve session",
    });
  }
});
app.use("/api", commentRouter);
app.use("/api", followRouter);
app.use("/api", profileRouter);
app.use("/api/feed", feedRouter);
app.use("/api", likeRouter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Enj API",
    /**
     * Where the browser should open the websocket. The frontend and the API
     * are served from different origins and a websocket upgrade cannot be
     * proxied through Vercel, so the client connects to this URL directly.
     */
    socketUrl:
      process.env.SOCKET_PUBLIC_URL ||
      process.env.BETTER_AUTH_URL ||
      `${req.protocol}://${req.get("host")}`,
  });
});

app.use("/api/posts", postRouter);
app.use("/api", storyRouter);
app.use("/api", notificationRouter);
app.use("/api", storyReactionRouter);
app.use("/api", uploadRouter);
app.use("/api", messageRouter);
app.use("/api", exploreRouter);
app.use("/api", bookmarkRouter);
app.use("/api", presenceRouter);

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});
