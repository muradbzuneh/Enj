/**
 * Follow / Unfollow toggle button with optimistic UI and loading state.
 * Endpoint: POST / DELETE /api/users/:userId/follow
 */

import React, { useState } from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md';
  /** `compact` renders a small pill without icons - used inside post headers. */
  variant?: 'default' | 'compact';
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  initialIsFollowing = false,
  onFollowChange,
  size = 'sm',
  variant = 'default',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  if (user && user.id === userId) {
    return null; // Do not render follow button on own profile
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to follow users', 'info');
      return;
    }
    if (isLoading) return;

    const prevState = isFollowing;
    const nextState = !prevState;
    setIsFollowing(nextState);
    setIsLoading(true);

    try {
      if (nextState) {
        await api.users.follow(userId);
      } else {
        await api.users.unfollow(userId);
      }
      onFollowChange?.(nextState);
    } catch (err: any) {
      setIsFollowing(prevState);
      showToast(err?.message || 'Failed to update follow status', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
          isFollowing
            ? 'text-slate-600 dark:text-zinc-300 border border-slate-300 dark:border-[#3a4150] hover:border-rose-400 hover:text-rose-500'
            : 'text-white bg-[#FF3366] hover:bg-[#EE2055]'
        } ${isLoading ? 'opacity-60 cursor-wait' : ''}`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={isFollowing ? 'outline' : 'primary'}
      onClick={handleToggle}
      disabled={isLoading}
      isLoading={isLoading}
      className={isFollowing ? 'hover:border-rose-500/40 hover:text-rose-400' : ''}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow</span>
        </>
      )}
    </Button>
  );
};
