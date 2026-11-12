/**
 * Left Sidebar Navigation Component for ENJ.
 * Icons: Home, Explore, Likes, Search, Settings, Profile
 */

import React, { useState } from 'react';
import { Home, Compass, Film, Search, Settings, User, LogOut, LogIn, MessageSquare } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export interface SidebarNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCompose?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentPath,
  onNavigate,
  onOpenCompose,
}) => {
  const { user, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: Home, requiresAuth: false },
    { label: 'Reels', path: '/reels', icon: Film, requiresAuth: false },
    { label: 'Explore', path: '/explore', icon: Compass, requiresAuth: false },
    { label: 'Messages', path: '/messages', icon: MessageSquare, requiresAuth: true },
    { label: 'Search', path: '/search', icon: Search, requiresAuth: false },
    { label: 'Settings', path: '/settings/profile', icon: Settings, requiresAuth: true, exact: true },
    {
      label: 'Profile',
      path: user ? `/profile/${user.id}` : '/login',
      icon: User,
      requiresAuth: true,
    },
  ];

  return (
    <>
    <aside className="w-60 shrink-0 sticky top-20 flex flex-col justify-between h-[calc(100vh-60rem)] pb-10 hidden md:flex">
      <div className="space-y-4">
        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? currentPath === '/'
              : (item as any).exact
                ? currentPath === item.path
                : currentPath.startsWith(item.path);

            if (item.requiresAuth && !user) {
              return null;
            }

            const handleClick = () => {
              onNavigate(item.path);
            };

            return (
              <button
                key={item.label}
                type="button"
                onClick={handleClick}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-100 dark:bg-[#1e2229] text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-[#1a1d23] hover:text-slate-900 dark:hover:text-[#f3f4f6]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#FF3366]'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile / session pill */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-[#262a32]">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] shadow-2xs">
            <div
              onClick={() => onNavigate(`/profile/${user.id}`)}
              className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
            >
              <Avatar src={user.image} name={user.name || user.username} size="sm" />
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#f3f4f6] truncate">
                  {user.name || user.username}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">@{user.username}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FF3366] hover:bg-[#EE2055] text-white transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/signup')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#2d333b] bg-white dark:bg-[#1a1d23] text-slate-700 dark:text-[#e1e1e1] hover:bg-slate-50 dark:hover:bg-[#22272e] transition-colors cursor-pointer"
            >
              <span>Create Account</span>
            </button>
          </div>
        )}
      </div>
    </aside>

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
    </>
  );
};
