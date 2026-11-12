/**
 * Reusable PostCard Component for ENJ.
 * Receives structured post data and delegates actions.
 * Supports like/unlike, comment toggle, edit, delete (for own posts), and link sharing.
 * Adaptive styling for both Default Light (White) mode and Dark mode.
 */

import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit3, Share2, Bookmark } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { ShareDialog } from './ShareDialog';
import { VideoPlayer } from './VideoPlayer';
import { MediaImage } from './MediaImage';
import { formatTimeAgo } from '../../lib/utils/date';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { api } from '../../services/api';
import type { Post } from '../../types';

function renderContentWithHashtags(content: string, onHashtagClick: (tag: string) => void) {
  const parts = content.split(/(#[\w\u0590-\u05FF]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); onHashtagClick(part); }}
          className="text-[#FF3366] font-semibold hover:underline cursor-pointer"
        >
          {part}
        </button>
      );
    }
    return part;
  });
}

export interface PostCardProps {
  post: Post;
  onPostUpdated?: (updated: Post) => void;
  onPostDeleted?: (postId: string) => void;
  onCommentClick?: (post: Post) => void;
  onProfileClick?: (username: string | null) => void;
  onEditClick?: (post: Post) => void;
  onHashtagClick?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onPostUpdated,
  onPostDeleted,
  onCommentClick,
  onProfileClick,
  onEditClick,
  onHashtagClick,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isLiking, setIsLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));

  // Sync state if post prop updates
  React.useEffect(() => {
    setLikesCount(post.likesCount);
    setIsLiked(Boolean(post.isLiked));
  }, [post.likesCount, post.isLiked]);

  const isOwnPost = Boolean(user && user.id && post.authorId && user.id === post.authorId);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to like posts', 'info');
      return;
    }
    if (isLiking) return;

    // Optimistic UI update
    const prevLiked = isLiked;
    const prevCount = likesCount;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    setIsLiking(true);

    try {
      if (nextLiked) {
        const res = await api.likes.like(post.id);
        setLikesCount(res.likesCount);
        setIsLiked(res.isLiked);
      } else {
        const res = await api.likes.unlike(post.id);
        setLikesCount(res.likesCount);
        setIsLiked(res.isLiked);
      }
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          isLiked: nextLiked,
          likesCount: nextCount,
        });
      }
    } catch (err: any) {
      // Rollback on failure
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      showToast(err?.message || 'Failed to update like status', 'error');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.posts.delete(post.id);
      showToast('Post deleted', 'success');
      onPostDeleted?.(post.id);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareOpen(true);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to bookmark posts', 'info');
      return;
    }
    setIsBookmarked((prev) => !prev);
    try {
      const res = await api.bookmarks.toggle(post.id);
      setIsBookmarked(res.isBookmarked);
    } catch {
      setIsBookmarked((prev) => !prev);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProfileClick?.(post.author.username || post.author.id);
  };

  const dropdownItems = [
    ...(isOwnPost
      ? [
          {
            label: 'Edit post',
            icon: <Edit3 className="w-4 h-4" />,
            onClick: () => onEditClick?.(post),
          },
          {
            label: 'Delete post',
            icon: <Trash2 className="w-4 h-4" />,
            danger: true,
            onClick: handleDelete,
          },
        ]
      : []),
    {
      label: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      onClick: () => setIsShareOpen(true),
    },
  ];

  return (
    <article
      id={`post-${post.id}`}
      className={`bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors hover:border-slate-300 dark:hover:border-[#383f4a] relative ${
        isDeleting ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Author info */}
        <div
          onClick={handleAuthorClick}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <Avatar
            src={post.author.image}
            name={post.author.name || post.author.username || 'User'}
            size="md"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] group-hover:text-[#FF3366] dark:group-hover:text-[#FF5E7E] transition-colors">
              {post.author.name || post.author.username}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
              <span>@{post.author.username}</span>
              <span>·</span>
              <time dateTime={post.createdAt}>{formatTimeAgo(post.createdAt)}</time>
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">(edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown actions */}
        <Dropdown
          trigger={
            <button
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#22272e] rounded-xl transition-colors cursor-pointer"
              aria-label="Post options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={dropdownItems}
        />
      </div>

      {/* Post body */}
      <div className="mt-3 text-sm text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
        {onHashtagClick
          ? renderContentWithHashtags(post.content, onHashtagClick)
          : post.content}
      </div>

      {/* Attached Media */}
      {post.mediaUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#2d333b] bg-slate-100 dark:bg-black/40">
          {/\.(mp4|webm|ogg|mov|avi|mkv|quicktime)$/i.test(post.mediaUrl) || post.mediaUrl.includes('video') ? (
            <VideoPlayer src={resolveMediaUrl(post.mediaUrl)} className="max-h-96" />
          ) : (
            <MediaImage
              src={resolveMediaUrl(post.mediaUrl)}
              alt="Attached post visual"
              className="w-full h-auto object-cover max-h-96 hover:scale-[1.01] transition-transform duration-200"
            />
          )}
        </div>
      )}

      {/* Engagement footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262a32] flex items-center gap-6 select-none">
        <button
          type="button"
          onClick={handleLikeToggle}
          disabled={isLiking}
          className={`flex items-center gap-1.5 text-xs font-semibold transition-colors py-1 cursor-pointer ${
            isLiked ? 'text-rose-500' : 'text-slate-500 dark:text-zinc-400 hover:text-rose-500'
          }`}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
        >
          <Heart className={`w-4 h-4 transition-transform active:scale-125 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
          <span>{likesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onCommentClick?.(post)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-[#FF3366] dark:hover:text-[#FF5E7E] transition-colors py-1 cursor-pointer"
          aria-label="View or write comments"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentsCount}</span>
        </button>

        <button
          type="button"
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors py-1 cursor-pointer ${
            isBookmarked ? 'text-[#FFAA00]' : 'text-slate-400 dark:text-zinc-500 hover:text-[#FFAA00]'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors py-1 cursor-pointer"
          aria-label="Share post"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        postUrl={window.location.origin + `/?post=${post.id}`}
        postContent={post.content}
      />
    </article>
  );
};
