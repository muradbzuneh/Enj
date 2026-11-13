/**
 * Realtime client (Socket.IO).
 *
 * The websocket cannot be proxied through the Vercel rewrite (a websocket
 * upgrade is not supported there), so the client connects straight to the API
 * host. That host is discovered at runtime from `GET /api/health`, so no
 * environment variable has to be kept in sync.
 *
 * Authentication uses the BetterAuth session token - the session cookie is
 * not attached to the handshake because the socket is a cross-origin request.
 */
import { io, type Socket } from "socket.io-client";

export const SOCKET_EVENTS = {
  /* client -> server */
  MESSAGE_SEND: "message:send",
  MESSAGE_TYPING: "message:typing",
  MESSAGE_MARK_READ: "message:mark-read",
  CONVERSATION_READ: "conversation:read",
  PRESENCE_PING: "presence:ping",
  CONVERSATION_JOIN: "conversation:join",

  /* server -> client */
  MESSAGE_NEW: "message:new",
  MESSAGE_DELIVERED: "message:delivered",
  MESSAGE_READ: "message:read",
  NOTIFICATION_NEW: "notification:new",
  POST_NEW: "post:new",
  PRESENCE_UPDATE: "presence:update",
  READY: "ready",
} as const;

let socket: Socket | null = null;
let socketUrl: string | null = null;

/**
 * Resolves the websocket URL from the API (same-origin request, so it always
 * works - the API exposes its own public URL).
 */
async function resolveSocketUrl(): Promise<string> {
  if (socketUrl) return socketUrl;

  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const json = await res.json();
    if (json?.socketUrl) {
      socketUrl = String(json.socketUrl).replace(/\/$/, "");
      return socketUrl;
    }
  } catch {
    // fall through to the default
  }

  // Local development: the Vite dev server proxies /api to the API.
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  socketUrl = isLocal ? "http://localhost:4001" : window.location.origin;
  return socketUrl;
}

/**
 * Opens (or reuses) the realtime connection.
 */
export async function connectSocket(token: string): Promise<Socket> {
  if (socket?.connected) return socket;

  const url = await resolveSocketUrl();

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 15000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Sends a message through the socket (falls back to REST when offline). */
export function emitMessage(payload: {
  conversationId: string;
  content: string;
}): void {
  socket?.emit(SOCKET_EVENTS.MESSAGE_SEND, payload);
}

export function emitTyping(conversationId: string, isTyping: boolean): void {
  socket?.emit(SOCKET_EVENTS.MESSAGE_TYPING, { conversationId, isTyping });
}

export function emitMessageRead(messageId: string): void {
  socket?.emit(SOCKET_EVENTS.MESSAGE_MARK_READ, { messageId });
}

export function emitConversationRead(conversationId: string): void {
  socket?.emit(SOCKET_EVENTS.CONVERSATION_READ, { conversationId });
}

export function emitConversationJoin(conversationId: string): void {
  socket?.emit(SOCKET_EVENTS.CONVERSATION_JOIN, { conversationId });
}
