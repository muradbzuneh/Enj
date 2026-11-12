/**
 * Real-time layer (Socket.IO).
 *
 * Responsibilities:
 *  - authenticate every socket with the session token issued by BetterAuth
 *  - track presence (who is online) and last-seen timestamps
 *  - fan out messages, notifications and new posts to the right recipients
 *
 * The socket authenticates with the *session token* rather than the session
 * cookie: the browser talks to this server from another origin (the frontend
 * domain), so the cookie is not attached to the handshake.
 */

import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { prisma } from "./prisma.js";
import { auth } from "./auth.js";

/* ------------------------------------------------------------------ */
/* Event names (shared with the frontend)                              */
/* ------------------------------------------------------------------ */

export const SOCKET_EVENTS = {
  /* client -> server */
  MESSAGE_SEND: "message:send",
  /** used in both directions (client -> "is typing", server -> broadcast) */
  MESSAGE_TYPING: "message:typing",
  MESSAGE_MARK_READ: "message:mark-read",
  CONVERSATION_READ: "conversation:read",
  PRESENCE_PING: "presence:ping",

  /* server -> client */
  MESSAGE_NEW: "message:new",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ: "message:read",
  NOTIFICATION_NEW: "notification:new",
  POST_NEW: "post:new",
  PRESENCE_UPDATE: "presence:update",
  CONVERSATION_NEW: "conversation:new",
  READY: "ready",
} as const;

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

/** userId -> number of open sockets */
const presence = new Map<string, number>();

/** userId -> timestamp of the last heartbeat */
const lastSeen = new Map<string, number>();

/** conversationId -> userId -> expiry timestamp (typing indicator) */
const typing = new Map<string, Map<string, number>>();

const TYPING_TTL_MS = 4000;

export function isOnline(userId: string): boolean {
  return (presence.get(userId) ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return Array.from(presence.entries())
    .filter(([, count]) => count > 0)
    .map(([userId]) => userId);
}

/**
 * Emits to every socket of a user.
 * Safe to call when the user has no open socket (e.g. a notification for an
 * offline user) - it simply does nothing.
 */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

/**
 * Emits to every connected socket of the given users (used for feed updates
 * to followers and for live messages).
 */
export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!io || userIds.length === 0) return;
  io.to(userIds.map((id) => `user:${id}`)).emit(event, payload);
}

/**
 * Emits to every connected socket of a conversation.
 */
export function emitToConversation(
  conversationId: string,
  event: string,
  payload: unknown,
) {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
}

/**
 * Makes every socket of a user join a conversation room.
 *
 * Called when a conversation is opened (REST or socket) so both participants
 * receive the live messages of that conversation.
 */
export function joinConversationRoom(userId: string, conversationId: string) {
  io?.in(`user:${userId}`).socketsJoin(`conversation:${conversationId}`);
}

let io: Server | null = null;

/* ------------------------------------------------------------------ */
/* Authentication                                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolves a BetterAuth session token to a user.
 *
 * The client sends the raw session token (the value BetterAuth returns in the
 * sign-in / sign-up response and in `GET /api/auth/get-session`). The raw
 * token is what is stored in the `session` table, so it is looked up directly
 * - that is exactly what the cookie signature protects.
 *
 * A signed cookie value (`token.signature`) is also accepted for convenience.
 */
async function resolveSessionUser(token: string) {
  const raw = decodeURIComponent(token).trim();

  // 1. raw token stored in the session table
  try {
    const session = await prisma.session.findUnique({
      where: { token: raw },
      include: { user: true },
    });

    if (session && new Date(session.expiresAt).getTime() > Date.now()) {
      return session.user;
    }
  } catch {
    // fall through
  }

  // 2. signed cookie value - validate it the same way the HTTP layer does
  const cookieNames = [
    "__Secure-better-auth.session_token",
    "better-auth.session_token",
  ];

  for (const name of cookieNames) {
    try {
      const headers = new Headers({ cookie: `${name}=${raw}` });
      const session = await auth.api.getSession({ headers });
      if (session?.user) return session.user;
    } catch {
      // try the next cookie name
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Server bootstrap                                                    */
/* ------------------------------------------------------------------ */

export function attachSocketServer(httpServer: HttpServer) {
  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      // The frontend is served from a different origin, so the handshake
      // needs an explicit CORS allowance (credentials are not used - the
      // socket authenticates with a token).
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // allow any origin in development
        if (process.env.NODE_ENV !== "production") return callback(null, true);
        return callback(new Error("Origin not allowed"));
      },
      methods: ["GET", "POST"],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth as { token?: string } | undefined)?.token ||
      socket.handshake.headers["x-session-token"];

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    const user = await resolveSessionUser(token);
    if (!user) {
      return next(new Error("Invalid session"));
    }

    socket.data.userId = user.id;
    socket.data.username = user.username ?? null;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    /* ---------------- presence ---------------- */

    const count = (presence.get(userId) ?? 0) + 1;
    presence.set(userId, count);
    lastSeen.set(userId, Date.now());
    void prisma.user
      .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    socket.join(`user:${userId}`);

    // Tell the people this user follows (and the followers) that they are online.
    void broadcastPresence(userId, true);

    socket.emit(SOCKET_EVENTS.READY, {
      userId,
      online: getOnlineUserIds(),
      serverTime: Date.now(),
    });

    /* ---------------- messages ---------------- */

    socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (payload, ack) => {
      try {
        const conversationId = String(payload?.conversationId ?? "");
        const content = String(payload?.content ?? "").trim();

        if (!conversationId || !content) {
          return ack?.({ ok: false, error: "conversationId and content are required" });
        }

        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId },
          select: { userId: true },
        });

        if (!participant) {
          return ack?.({ ok: false, error: "Not a participant of this conversation" });
        }

        const message = await prisma.message.create({
          data: { content, conversationId, authorId: userId },
          include: {
            author: { select: { id: true, name: true, username: true, image: true } },
          },
        });

        const payloadMessage = {
          ...message,
          createdAt: message.createdAt.toISOString(),
        };

        // Everyone in the conversation receives it (both parties, so all tabs
        // of the sender stay in sync too).
        io?.to(`conversation:${conversationId}`).emit(
          SOCKET_EVENTS.MESSAGE_NEW,
          payloadMessage,
        );
        socket.join(`conversation:${conversationId}`);

        // Mark delivered when the recipient is online.
        const recipientIds = await getParticipantIds(conversationId, userId);
        const onlineRecipient = recipientIds.find((id) => isOnline(id));
        if (onlineRecipient) {
          await prisma.message.updateMany({
            where: { id: message.id, deliveredAt: null },
            data: { deliveredAt: new Date() },
          });
          emitToUser(userId, SOCKET_EVENTS.MESSAGE_DELIVERED, {
            messageId: message.id,
            deliveredAt: new Date().toISOString(),
          });
        }

        // Notify the recipient (bell + live badge).
        for (const recipientId of recipientIds) {
          await createAndEmitNotification({
            type: "message",
            message: `New message from ${socket.data.username ?? "someone"}`,
            actorId: userId,
            userId: recipientId,
          });
        }

        ack?.({ ok: true, message: payloadMessage });
      } catch (error) {
        console.error("SOCKET MESSAGE SEND ERROR:", error);
        ack?.({ ok: false, error: "Unable to send message" });
      }
    });

    socket.on(SOCKET_EVENTS.MESSAGE_TYPING, async (payload) => {
      const conversationId = String(payload?.conversationId ?? "");
      if (!conversationId) return;

      const isTyping = Boolean(payload?.isTyping);

      if (isTyping) {
        let users = typing.get(conversationId);
        if (!users) {
          users = new Map();
          typing.set(conversationId, users);
        }
        users.set(userId, Date.now());
      } else {
        typing.get(conversationId)?.delete(userId);
      }

      const recipientIds = await getParticipantIds(conversationId, userId);
      emitToUsers(recipientIds, SOCKET_EVENTS.MESSAGE_TYPING, {
        conversationId,
        userId,
        isTyping,
      });
    });

    socket.on(SOCKET_EVENTS.MESSAGE_MARK_READ, async (payload, ack) => {
      try {
        const messageId = String(payload?.messageId ?? "");
        if (!messageId) return ack?.({ ok: false });

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { id: true, conversationId: true, authorId: true },
        });
        if (!message) return ack?.({ ok: false });

        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId: message.conversationId, userId },
          select: { userId: true },
        });
        if (!participant) return ack?.({ ok: false });

        const now = new Date();
        await prisma.message.update({
          where: { id: messageId },
          data: { read: true, readAt: now, deliveredAt: message.id ? now : null },
        });

        emitToUser(message.authorId, SOCKET_EVENTS.MESSAGE_READ, {
          messageId,
          readAt: now.toISOString(),
        });

        ack?.({ ok: true });
      } catch (error) {
        console.error("SOCKET MESSAGE READ ERROR:", error);
        ack?.({ ok: false });
      }
    });

    /** Mark every message in a conversation as read. */
    socket.on(SOCKET_EVENTS.CONVERSATION_READ, async (payload) => {
      try {
        const conversationId = String(payload?.conversationId ?? "");
        if (!conversationId) return;

        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId },
          select: { userId: true },
        });
        if (!participant) return;

        const now = new Date();
        const updated = await prisma.message.updateMany({
          where: { conversationId, read: false, authorId: { not: userId } },
          data: { read: true, readAt: now, deliveredAt: now },
        });

        if (updated.count > 0) {
          const recipientIds = await getParticipantIds(conversationId, userId);
          emitToUsers(recipientIds, SOCKET_EVENTS.MESSAGE_READ, {
            conversationId,
            readAt: now.toISOString(),
          });
        }
      } catch (error) {
        console.error("SOCKET CONVERSATION READ ERROR:", error);
      }
    });

    socket.on(SOCKET_EVENTS.PRESENCE_PING, () => {
      lastSeen.set(userId, Date.now());
    });

    /** Join a conversation room so its live messages arrive. */
    socket.on("conversation:join", async (payload) => {
      const conversationId = String(payload?.conversationId ?? "");
      if (!conversationId) return;

      const participant = await prisma.conversationParticipant.findFirst({
        where: { conversationId, userId },
        select: { userId: true },
      });
      if (!participant) return;

      socket.join(`conversation:${conversationId}`);
    });

    /* ---------------- disconnect ---------------- */

    socket.on("disconnect", () => {
      const remaining = (presence.get(userId) ?? 1) - 1;

      if (remaining <= 0) {
        presence.delete(userId);
        lastSeen.set(userId, Date.now());
        void prisma.user
          .update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
          .catch(() => undefined);
        void broadcastPresence(userId, false);
      } else {
        presence.set(userId, remaining);
      }

      // Clear typing indicators of this user.
      for (const [, users] of typing) {
        users.delete(userId);
      }
    });
  });

  // Expire stale typing indicators.
  setInterval(() => {
    const now = Date.now();
    for (const [conversationId, users] of typing) {
      for (const [uid, expiry] of users) {
        if (now - expiry > TYPING_TTL_MS) users.delete(uid);
      }
      if (users.size === 0) typing.delete(conversationId);
    }
  }, 2000).unref?.();

  return io;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function getParticipantIds(conversationId: string, excludeUserId?: string) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return participants
    .map((p) => p.userId)
    .filter((id) => id !== excludeUserId);
}

/**
 * Creates a notification row and pushes it live to the recipient.
 */
export async function createAndEmitNotification(input: {
  type: string;
  message: string;
  actorId: string;
  userId: string;
  postId?: string | null;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: input.type,
        message: input.message,
        actorId: input.actorId,
        userId: input.userId,
        postId: input.postId ?? null,
      },
      include: {
        actor: { select: { id: true, name: true, username: true, image: true } },
        post: { select: { id: true, content: true } },
      },
    });

    emitToUser(input.userId, SOCKET_EVENTS.NOTIFICATION_NEW, {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  } catch (error) {
    console.error("CREATE NOTIFICATION ERROR:", error);
    return null;
  }
}

/**
 * Lets the followers of an author know that a new post is available.
 * The feed itself is not mutated - the client shows a "new posts" banner.
 */
export async function emitNewPostToFollowers(post: {
  id: string;
  content: string;
  mediaUrl: string | null;
  authorId: string;
  createdAt: Date;
  author: { id: string; name: string; username: string | null; image: string | null };
}) {
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: post.authorId },
      select: { followerId: true },
    });

    const followerIds = followers.map((f) => f.followerId);
    if (followerIds.length === 0) return;

    emitToUsers(followerIds, SOCKET_EVENTS.POST_NEW, {
      ...post,
      createdAt: post.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("EMIT NEW POST ERROR:", error);
  }
}

/**
 * Tells the people around a user that their presence changed.
 */
async function broadcastPresence(userId: string, online: boolean) {
  try {
    const related = await prisma.follow.findMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
      select: { followerId: true, followingId: true },
    });

    const ids = new Set<string>();
    related.forEach((r) => {
      ids.add(r.followerId);
      ids.add(r.followingId);
    });
    ids.delete(userId);

    emitToUsers(Array.from(ids), SOCKET_EVENTS.PRESENCE_UPDATE, {
      userId,
      online,
      lastSeenAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("BROADCAST PRESENCE ERROR:", error);
  }
}

