import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, Loader2, Check, CheckCheck } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { SOCKET_EVENTS, emitTyping, emitMessageRead, emitConversationJoin } from '../../lib/socket';

interface MessageBubble {
  id: string;
  content: string;
  authorId: string;
  author: { id: string; name: string; username: string | null; image?: string | null };
  read: boolean;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  /** Local only - the message is still being sent. */
  pending?: boolean;
}

export interface ChatPanelProps {
  conversationId: string;
  otherUser: { id: string; name: string; username: string | null; image?: string | null };
  onBack: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ conversationId, otherUser, onBack }) => {
  const { user } = useAuth();
  const { socket, typingUsers, messageVersion, onlineUserIds } = useSocket();
  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = Boolean(typingUsers[conversationId]);
  const otherIsOnline = onlineUserIds.has(otherUser.id);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---------------- load ---------------- */

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.messages.getMessages(conversationId);
      setMessages(res.items as MessageBubble[]);
    } catch {
      /* keep the current list */
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const res = await api.messages.getMessages(conversationId);
        if (mounted) setMessages(res.items as MessageBubble[]);
      } catch {} finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    emitConversationJoin(conversationId);

    return () => {
      mounted = false;
    };
  }, [conversationId]);

  /* ---------------- live messages ---------------- */

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: MessageBubble) => {
      if (message.conversationId !== conversationId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // The recipient read it right away.
      if (message.authorId !== user?.id) {
        emitMessageRead(message.id);
        emitConversationJoin(conversationId);
      }
    };

    const onDelivered = (payload: { messageId: string; deliveredAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, deliveredAt: payload.deliveredAt } : m,
        ),
      );
    };

    const onRead = (payload: { messageId?: string; conversationId?: string; readAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.authorId === user?.id &&
          (!payload.messageId || payload.messageId === m.id)
            ? { ...m, read: true, readAt: payload.readAt, deliveredAt: m.deliveredAt ?? payload.readAt }
            : m,
        ),
      );
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, onDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, onRead);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, onDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, onRead);
    };
  }, [socket, conversationId, user?.id]);

  /* ---------------- read receipts ---------------- */

  useEffect(() => {
    // Opening the conversation marks everything as read.
    const unread = messages.filter((m) => m.authorId !== user?.id && !m.read);
    if (unread.length === 0) return;

    unread.forEach((m) => emitMessageRead(m.id));
    emitConversationJoin(conversationId);
  }, [messages, user?.id, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ---------------- typing ---------------- */

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!socket) return;

    emitTyping(conversationId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitTyping(conversationId, false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      emitTyping(conversationId, false);
    };
  }, [conversationId]);

  /* ---------------- send ---------------- */

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setInputText('');
    emitTyping(conversationId, false);

    try {
      const msg = await api.messages.sendMessage(conversationId, content);
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg as MessageBubble],
      );
    } catch {
      // The socket delivers the message even when the REST call fails.
    } finally {
      setIsSending(false);
    }
  };

  const isLastOwnMessage = (msg: MessageBubble) => {
    if (msg.authorId !== user?.id) return false;
    const index = messages.findIndex((m) => m.id === msg.id);
    return index === messages.length - 1;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-[#2d333b]">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#22272e] cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
        </button>

        <div className="relative">
          <Avatar src={otherUser.image} name={otherUser.name} size="sm" />
          {otherIsOnline && (
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#1a1d23]"
              title="Online"
            />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] truncate">
            {otherUser.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
            {isTyping ? (
              <span className="text-[#FF3366] font-medium">typing…</span>
            ) : otherIsOnline ? (
              <span className="text-emerald-500 font-medium">online</span>
            ) : (
              `@${otherUser.username}`
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-400 dark:text-zinc-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.authorId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar
                      src={msg.author.image}
                      name={msg.author.name}
                      size="sm"
                      className="w-6 h-6 shrink-0"
                    />
                  )}
                  <div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-[#FF3366] text-white rounded-br-md'
                          : 'bg-slate-100 dark:bg-[#22272e] text-slate-900 dark:text-[#f3f4f6] rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div
                      className={`flex items-center gap-1 mt-0.5 ${
                        isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {isOwn && isLastOwnMessage(msg) && (
                        <span title={msg.readAt ? 'Read' : msg.deliveredAt ? 'Delivered' : 'Sent'}>
                          {msg.readAt ? (
                            <CheckCheck className="w-3 h-3 text-sky-400" />
                          ) : msg.deliveredAt ? (
                            <CheckCheck className="w-3 h-3 text-slate-400" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#22272e]">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-slate-200/80 dark:border-[#2d333b]"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type a message..."
          aria-label="Message"
          className="flex-1 text-sm rounded-full border border-slate-200 dark:border-[#2d333b] bg-slate-50 dark:bg-[#121418] px-4 py-2.5 text-slate-900 dark:text-[#f3f4f6] placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF3366]/30 focus:border-[#FF3366] transition-all"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          aria-label="Send message"
          className="w-10 h-10 rounded-full bg-[#FF3366] text-white flex items-center justify-center hover:bg-[#EE2055] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
