import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface MessageBubble {
  id: string;
  content: string;
  authorId: string;
  author: { id: string; name: string; username: string | null; image?: string | null };
  createdAt: string;
}

export interface ChatPanelProps {
  conversationId: string;
  otherUser: { id: string; name: string; username: string | null; image?: string | null };
  onBack: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ conversationId, otherUser, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.messages.getMessages(conversationId);
        if (mounted) setMessages(res.items);
      } catch {} finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    try {
      const msg = await api.messages.sendMessage(conversationId, inputText.trim());
      setMessages((prev) => [...prev, msg]);
      setInputText('');
    } catch {} finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-[#2d333b]">
        <button type="button" onClick={onBack} className="md:hidden p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#22272e] cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
        </button>
        <Avatar src={otherUser.image} name={otherUser.name} size="sm" />
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">{otherUser.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500">@{otherUser.username}</p>
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
                    <Avatar src={msg.author.image} name={msg.author.name} size="sm" className="w-6 h-6 shrink-0" />
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
                    <p className={`text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-slate-200/80 dark:border-[#2d333b]">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
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
