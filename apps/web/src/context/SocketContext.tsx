/**
 * Realtime context.
 *
 * Owns the Socket.IO connection and exposes the live state the UI needs:
 *  - connection status
 *  - who is online
 *  - who is typing in which conversation
 *  - the live notification badge count
 *  - the number of new posts waiting in the feed
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  connectSocket,
  disconnectSocket,
  getSocket,
} from "../lib/socket";
import { useAuth } from "./AuthContext";
import type { NotificationItem } from "../services/notifications.service";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  /** Ids of the users that are currently online. */
  onlineUserIds: Set<string>;
  /** conversationId -> id of the user that is typing. */
  typingUsers: Record<string, string>;
  /** Live count of unread notifications (mirrors the bell badge). */
  liveUnreadCount: number;
  /** Number of new posts that arrived while the feed was open. */
  pendingPostCount: number;
  /** The most recent live notification (used for toasts). */
  lastNotification: NotificationItem | null;
  /** Called when the user opens a conversation - clears the typing hint. */
  clearTyping: (conversationId: string) => void;
  /** Called by the feed when the user asks for the new posts. */
  consumePendingPosts: () => void;
  /** Incremented whenever a message arrives, so lists can refresh. */
  messageVersion: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, sessionToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [liveUnreadCount, setLiveUnreadCount] = useState(0);
  const [pendingPostCount, setPendingPostCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<NotificationItem | null>(null);
  const [messageVersion, setMessageVersion] = useState(0);

  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;

    if (!user || !sessionToken) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      setOnlineUserIds(new Set());
      return;
    }

    const boot = async () => {
      const s = await connectSocket(sessionToken);
      if (cancelled) return;
      setSocket(s);
    };

    boot();

    return () => {
      cancelled = true;
      Object.values(typingTimers.current).forEach((t) => clearTimeout(t));
      typingTimers.current = {};
    };
  }, [user?.id, sessionToken]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onReady = (payload: { online?: string[] }) => {
      setIsConnected(true);
      if (Array.isArray(payload?.online)) {
        setOnlineUserIds(new Set(payload.online));
      }
    };

    const onPresence = (payload: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    };

    const onNotification = (payload: NotificationItem) => {
      setLastNotification(payload);
      setLiveUnreadCount((c) => c + 1);
    };

    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      const { conversationId, userId, isTyping } = payload;

      setTypingUsers((prev) => {
        const next = { ...prev };
        if (!isTyping) {
          delete next[conversationId];
          return next;
        }
        next[conversationId] = userId;
        return next;
      });

      // The server expires typing indicators after a few seconds - mirror that
      // on the client so the hint never sticks around.
      const existing = typingTimers.current[conversationId];
      if (existing) clearTimeout(existing);

      if (isTyping) {
        typingTimers.current[conversationId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          });
        }, 4000);
      }
    };

    const onNewMessage = () => {
      setMessageVersion((v) => v + 1);
    };

    const onNewPost = () => {
      setPendingPostCount((c) => c + 1);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET_EVENTS.READY, onReady);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, onPresence);
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, onNotification);
    socket.on(SOCKET_EVENTS.MESSAGE_TYPING, onTyping);
    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);
    socket.on(SOCKET_EVENTS.POST_NEW, onNewPost);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.READY, onReady);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, onPresence);
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, onNotification);
      socket.off(SOCKET_EVENTS.MESSAGE_TYPING, onTyping);
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);
      socket.off(SOCKET_EVENTS.POST_NEW, onNewPost);
    };
  }, [socket]);

  // Keep the presence list fresh with a periodic heartbeat.
  useEffect(() => {
    if (!socket || !isConnected) return;
    const timer = setInterval(() => {
      getSocket()?.emit(SOCKET_EVENTS.PRESENCE_PING);
    }, 30000);
    return () => clearInterval(timer);
  }, [socket, isConnected]);

  const value = useMemo<SocketContextType>(
    () => ({
      socket,
      isConnected,
      onlineUserIds,
      typingUsers,
      liveUnreadCount,
      pendingPostCount,
      lastNotification,
      messageVersion,
      clearTyping: (conversationId: string) =>
        setTypingUsers((prev) => {
          if (!prev[conversationId]) return prev;
          const next = { ...prev };
          delete next[conversationId];
          return next;
        }),
      consumePendingPosts: () => setPendingPostCount(0),
    }),
    [
      socket,
      isConnected,
      onlineUserIds,
      typingUsers,
      liveUnreadCount,
      pendingPostCount,
      lastNotification,
      messageVersion,
    ],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

