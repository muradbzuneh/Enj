import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import type { NotificationItem } from '../../services/notifications.service';

export interface NotificationBellProps {
  onNavigate: (path: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { lastNotification } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    if (!user) return;
    try {
      const count = await api.notifications.unreadCount();
      setUnreadCount(count);
    } catch {}
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.notifications.list(1, 10);
      setNotifications(res.items);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  /**
   * Live notifications: the bell badge grows the moment something happens and
   * the new entry is pushed into the open dropdown.
   */
  useEffect(() => {
    if (!lastNotification) return;

    setUnreadCount((prev) => prev + 1);
    setNotifications((prev) =>
      prev.some((n) => n.id === lastNotification.id) ? prev : [lastNotification, ...prev],
    );
  }, [lastNotification]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      default: return '🔔';
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#22272e] transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#FF3366] text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#262a32]">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#FF3366] font-medium hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-slate-300 dark:border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-6 h-6 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-zinc-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    handleMarkRead(n.id);
                    setIsOpen(false);
                    if (n.type === 'follow' && n.actor) {
                      onNavigate(`/profile/${n.actor.id}`);
                    } else if (n.post) {
                      onNavigate('/');
                    }
                  }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#22272e] transition-colors cursor-pointer border-b border-slate-50 dark:border-[#22272e] ${
                    !n.read ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''
                  }`}
                >
                  {n.actor ? (
                    <Avatar src={n.actor.image} name={n.actor.name} size="sm" />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#22272e] flex items-center justify-center text-sm">
                      {getIcon(n.type)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#FF3366] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
