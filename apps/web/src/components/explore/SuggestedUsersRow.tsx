import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { FollowButton } from '../profile/FollowButton';
import { api } from '../../services/api';
import type { FollowUserItem } from '../../types';

export interface SuggestedUsersRowProps {
  onProfileClick: (id: string) => void;
}

function compactCount(value?: number): string {
  if (!value) return '0';
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export const SuggestedUsersRow: React.FC<SuggestedUsersRowProps> = ({ onProfileClick }) => {
  const [users, setUsers] = useState<FollowUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.users.getSuggestions();
        if (mounted) setUsers(Array.isArray(res) ? res : []);
      } catch {
        /* suggestions are non-critical */
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
        Creators to follow
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {users.map((u) => (
          <div
            key={u.id}
            className="shrink-0 w-52 bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 text-center shadow-xs transition-colors hover:border-slate-300 dark:hover:border-[#3a4150]"
          >
            <div onClick={() => onProfileClick(u.id)} className="cursor-pointer">
              <Avatar src={u.image} name={u.name} size="lg" className="mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] mt-2 truncate">
                {u.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">
                @{u.username ?? 'user'}
              </p>

              {/* Social proof - how many people already follow them */}
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1.5 flex items-center justify-center gap-2">
                <span>
                  <strong className="text-slate-700 dark:text-zinc-300">
                    {compactCount(u.followerCount)}
                  </strong>{' '}
                  followers
                </span>
                {u.postCount !== undefined && (
                  <>
                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                    <span>
                      <strong className="text-slate-700 dark:text-zinc-300">
                        {compactCount(u.postCount)}
                      </strong>{' '}
                      posts
                    </span>
                  </>
                )}
              </p>

              {u.bio && (
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-2 line-clamp-2 min-h-[2rem]">
                  {u.bio}
                </p>
              )}
            </div>

            <div className="mt-3">
              <FollowButton
                userId={u.id}
                initialIsFollowing={u.isFollowing}
                size="sm"
                variant="compact"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
