import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { ConversationItem } from '../../components/messages/ConversationItem';
import { ChatPanel } from '../../components/messages/ChatPanel';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { SOCKET_EVENTS } from '../../lib/socket';

interface Conversation {
  id: string;
  otherUser: { id: string; name: string; username: string | null; image?: string | null } | null;
  lastMessage: { content: string; createdAt: string; authorName: string } | null;
  unreadCount: number;
  createdAt: string;
}

export interface MessagesPageProps {
  initialConversationId?: string;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ initialConversationId }) => {
  const { user } = useAuth();
  const { socket, messageVersion } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId || null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await api.messages.getConversations();
      setConversations(data as Conversation[]);
    } catch {
      /* keep the current list */
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    loadConversations();

    // Safety net - the socket updates the list instantly, this keeps it fresh
    // when the tab was in the background.
    const interval = setInterval(() => {
      if (mounted) loadConversations(true);
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user, loadConversations]);

  /**
   * Live conversation list: a new message reorders the list and bumps the
   * unread badge without a refresh.
   */
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: {
      conversationId: string;
      content: string;
      authorId: string;
      author: { id: string; name: string };
      createdAt: string;
    }) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === message.conversationId);
        if (!existing) {
          // A conversation we do not know about yet - reload the list.
          void loadConversations(true);
          return prev;
        }

        const isActive = activeId === message.conversationId;

        return prev
          .map((c) =>
            c.id === message.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    content: message.content,
                    createdAt: message.createdAt,
                    authorName: message.author?.name ?? '',
                  },
                  unreadCount: isActive ? 0 : c.unreadCount + 1,
                }
              : c,
          )
          .sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || a.createdAt;
            const bTime = b.lastMessage?.createdAt || b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
      });
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);
    };
  }, [socket, activeId, loadConversations]);

  // A message arrived somewhere - refresh the list counters.
  useEffect(() => {
    if (messageVersion === 0) return;
    void loadConversations(true);
  }, [messageVersion, loadConversations]);

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  /**
   * A conversation opened from a profile (Message button) was created moments
   * ago and is not part of the polled list yet. Fetch it directly so the chat
   * opens instantly instead of waiting for the next poll.
   */
  useEffect(() => {
    if (!initialConversationId) return;
    if (conversations.some((c) => c.id === initialConversationId)) return;

    let cancelled = false;
    api.messages
      .getConversation(initialConversationId)
      .then((conversation) => {
        if (cancelled || !conversation) return;
        setConversations((prev) =>
          prev.some((c) => c.id === conversation.id) ? prev : [conversation, ...prev],
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialConversationId, conversations]);

  if (!user) {
    return (
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-10 text-center shadow-xs transition-colors">
        <h2 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">Sign in to view messages</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Connect with others through direct messages.</p>
      </div>
    );
  }

  const activeConversation = conversations.find((c) => c.id === activeId);
  const showChat = activeId && activeConversation;

  return (
    <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl shadow-xs transition-colors overflow-hidden h-[calc(100vh-10rem)]">
      <div className="flex h-full">
        {/* Conversation List */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200/80 dark:border-[#2d333b]`}>
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-[#2d333b]">
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-zinc-400">No conversations yet.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeId}
                  onClick={() => setActiveId(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {showChat && activeConversation?.otherUser ? (
            <ChatPanel
              conversationId={activeId!}
              otherUser={activeConversation.otherUser}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-zinc-400">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
