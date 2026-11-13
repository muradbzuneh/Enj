/**
 * ProfileHeader component for ENJ user profile page.
 * Displays user identity, stats counters, follow button, or edit profile shortcut.
 * Adaptive styling for both Default Light (White) mode and Dark mode.
 */

import React from 'react';
import { Calendar, Edit3, MessageSquare } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { FollowButton } from './FollowButton';
import { PresenceDot } from '../presence/PresenceDot';
import { formatJoinedDate } from '../../lib/utils/date';
import type { Profile } from '../../types';

export interface ProfileHeaderProps {
  profile: Profile;
  onEditProfileClick?: () => void;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onFollowChange?: (isFollowing: boolean) => void;
  onMessageClick?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  onEditProfileClick,
  onFollowersClick,
  onFollowingClick,
  onFollowChange,
  onMessageClick,
}) => {
  return (
    <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-6 shadow-xs transition-colors">
      {/* Top row: Avatar & Action button */}
      <div className="flex items-start justify-between gap-4">
        <Avatar
          src={profile.image}
          name={profile.name || profile.username}
          size="xl"
          className="ring-2 ring-slate-200 dark:ring-white/10"
        />

        <div className="flex items-center gap-2">
          {profile.isOwnProfile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditProfileClick}
              className="gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit profile</span>
            </Button>
          ) : (
            <>
              <FollowButton
                userId={profile.id}
                initialIsFollowing={profile.isFollowing}
                onFollowChange={onFollowChange}
                size="md"
              />
              {onMessageClick && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onMessageClick}
                  className="gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Name and handle */}
      <div className="mt-4">
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-[#f3f4f6]">
          {profile.name || profile.username}
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-500 font-semibold">@{profile.username}</p>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-3 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed max-w-xl whitespace-pre-wrap">
          {profile.bio}
        </p>
      )}

      {/* Joined date */}
      {profile.createdAt && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Joined {formatJoinedDate(profile.createdAt)}</span>
        </div>
      )}

      {/* Live presence - shows who is available to chat right now */}
      {!profile.isOwnProfile && (
        <div className="mt-2">
          <PresenceDot userId={profile.id} variant="label" lastSeenAt={profile.lastSeenAt} />
        </div>
      )}

      {/* Counters */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#262a32] flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900 dark:text-[#f3f4f6]">{profile.postCount}</span>
          <span className="text-slate-500 dark:text-zinc-400">posts</span>
        </div>

        <button
          type="button"
          onClick={onFollowersClick}
          className="flex items-center gap-1.5 hover:underline cursor-pointer select-none"
        >
          <span className="font-bold text-slate-900 dark:text-[#f3f4f6]">{profile.followerCount}</span>
          <span className="text-slate-500 dark:text-zinc-400">followers</span>
        </button>

        <button
          type="button"
          onClick={onFollowingClick}
          className="flex items-center gap-1.5 hover:underline cursor-pointer select-none"
        >
          <span className="font-bold text-slate-900 dark:text-[#f3f4f6]">{profile.followingCount}</span>
          <span className="text-slate-500 dark:text-zinc-400">following</span>
        </button>
      </div>
    </div>
  );
};
