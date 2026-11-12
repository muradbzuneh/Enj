/**
 * Top Header Component for ENJ.
 * Features:
 * - Official ENJ Brand Logo
 * - Global Instant Search
 * - Theme Switcher (Light / Dark)
 * - User Profile & Quick Actions
 */

import React, { useState } from 'react';
import { Search, LogIn, UserPlus, Plus, LogOut, MessageSquare } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { NotificationBell } from '../notifications/NotificationBell';
import { useAuth } from '../../context/AuthContext';

export interface HeaderProps {
  onNavigate: (path: string) => void;
  onOpenCompose?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onOpenCompose,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
}) => {
  const { user, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.();
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark.border-[#2d333b] bg-white/95 dark:bg-[#1a1d23]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo matching user image */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
            aria-label="ENJ Home"
          >
            <Logo variant="wordmark" size="md" showAura />
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (window.location.pathname !== '/search') {
                  onNavigate('/search');
                }
              }}
              className="w-full text-xs rounded-xl border border-slate-200 dark.border-[#2d333b] bg-slate-50 dark.bg-[#121418] pl-9 pr-4 py-2 text-slate-900 dark.text-[#f3f4f6] placeholder.text-slate-400 dark.placeholder.text-zinc-500 focus:outline-none focus.bg-white dark.focus:bg-[#16181d] focus:ring-2 focus.ring-[#FF3366]/30 focus.border-[#FF3366] transition-all"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm.gap-3">
          {user ? (
            <>
              {onOpenCompose && (
                <button
                  type="button"
                  onClick={onOpenCompose}
                  className="sm.hidden p-2 rounded-xl bg-[#FF3366] hover:bg-[#EE2055] text-white shadow-2xs active.scale-95 transition-transform cursor-pointer"
                  title="Post to ENJ"
                  aria-label="Create new post"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="sm:hidden p-2 rounded-xl bg-[#FF3366] hover:bg-[#EE2055] text-white shadow-2xs active.scale-95 transition-transform cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              <NotificationBell onNavigate={onNavigate} />

              <button
                type="button"
                onClick={() => onNavigate('/messages')}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#22272e] transition-colors cursor-pointer"
                title="Messages"
                aria-label="Messages"
              >
                <MessageSquare className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate(`/profile/${user.id}`)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover.ring-[#FF3366]/50 transition-all cursor-pointer"
                aria-label="View your profile"
              >
                <Avatar src={user.image} name={user.name || user.username} size="sm" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/login')}
              >
                <LogIn className="w-3.5 h-3.5 mr-1" />
                <span>Sign in</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('/signup')}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                <span>Join</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await signOut();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
};