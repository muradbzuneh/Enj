import React from 'react';
import { Avatar } from '../ui/Avatar';
import { PresenceDot } from '../presence/PresenceDot';

export interface ConversationItemProps {
  conversation: {
    id: string;
    otherUser: { id: string; name: string; username: string | null; image?: string | null } | null;
    lastMessage: { content: string; createdAt: string; authorName: string } | null;
    unreadCount: number;
  };
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isActive, onClick }) => {
  const user = conversation.otherUser;
  const timeAgo = conversation.lastMessage
    ? formatTimeAgo(conversation.lastMessage.createdAt)
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      data-conversation-id={conversation.id}
      aria-label={`Open conversation with ${user?.name || 'user'}`}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
        isActive
          ? 'bg-rose-50 dark:bg-rose-950/20'
          : 'hover:bg-slate-50 dark:hover:bg-[#22272e]'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar src={user?.image} name={user?.name || '?'} size="md" />
        <PresenceDot
          userId={user?.id ?? ''}
          className="absolute bottom-0 right-0 ring-2 ring-white dark:ring-[#1a1d23]"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900 dark:text-[#f3f4f6] truncate">
            {user?.name || 'Unknown'}
          </p>
          {timeAgo && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">{timeAgo}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
            {conversation.lastMessage
              ? `${conversation.lastMessage.authorName}: ${conversation.lastMessage.content}`
              : 'No messages yet'}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-[#FF3366] text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
