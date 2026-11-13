import React from 'react';
import { useSocket } from '../../context/SocketContext';

export interface PresenceDotProps {
  userId: string;
  className?: string;
  /** Renders a small "last seen" hint next to the name instead of a dot. */
  variant?: 'dot' | 'label';
  lastSeenAt?: string | null;
}

/**
 * Shows whether a user is currently online.
 *
 * The realtime layer pushes presence updates, so the dot appears the moment
 * the other person opens the app.
 */
export const PresenceDot: React.FC<PresenceDotProps> = ({
  userId,
  className = '',
  variant = 'dot',
  lastSeenAt,
}) => {
  const { onlineUserIds } = useSocket();
  const isOnline = onlineUserIds.has(userId);

  if (variant === 'label') {
    if (isOnline) {
      return (
        <span className="text-[11px] font-medium text-emerald-500">online</span>
      );
    }
    if (!lastSeenAt) return null;

    const diff = Date.now() - new Date(lastSeenAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return <span className="text-[11px] text-slate-400">last seen just now</span>;
    if (mins < 60) return <span className="text-[11px] text-slate-400">last seen {mins}m ago</span>;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return <span className="text-[11px] text-slate-400">last seen {hours}h ago</span>;
    return (
      <span className="text-[11px] text-slate-400">
        last seen {Math.floor(hours / 24)}d ago
      </span>
    );
  }

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
        isOnline
          ? 'bg-emerald-500 ring-2 ring-emerald-500/25'
          : 'bg-slate-300 dark:bg-zinc-600'
      } ${className}`}
      title={isOnline ? 'Online' : 'Offline'}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
};
