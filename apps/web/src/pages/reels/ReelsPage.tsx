/**
 * Reels Page for ENJ.
 * TikTok/Instagram-style vertical snap-scroll feed.
 * Shows media-first posts, auto-loads more, supports swipe + wheel.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, RefreshCw, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { VideoPlayer } from '../../components/post/VideoPlayer';
import { ShareDialog } from '../../components/post/ShareDialog';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { api } from '../../services/api';
import type { Post } from '../../types';

export interface ReelsPageProps {
  onProfileClick: (identifier: string | null) => void;
  onCommentClick?: (post: Post) => void;
}

export const ReelsPage: React.FC<ReelsPageProps> = ({ onProfileClick, onCommentClick }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastTap = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await api.feed.getPersonalized(page, 30);
      const allPosts = res.posts || [];
      const withMedia = allPosts.filter((p) => p.mediaUrl);
      const withoutMedia = allPosts.filter((p) => !p.mediaUrl);
      const sorted = [...withMedia, ...withoutMedia];

      if (append) {
        setPosts((prev) => [...prev, ...sorted]);
      } else {
        setPosts(sorted);
      }

      hasMoreRef.current = res.pagination.hasMore;
      pageRef.current = page;
    } catch (err: any) {
      if (!append) setError(err?.message || 'Failed to load posts');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMoreRef.current) {
      fetchPosts(pageRef.current + 1, true);
    }
  }, [fetchPosts, isLoadingMore]);

  useEffect(() => {
    if (posts.length > 0 && currentIndex >= posts.length - 3 && hasMoreRef.current) {
      loadMore();
    }
  }, [currentIndex, posts.length, loadMore]);

  const currentPost = posts[currentIndex];

  const goTo = (dir: 'next' | 'prev') => {
    if (dir === 'next') {
      setCurrentIndex((prev) => (prev < posts.length - 1 ? prev + 1 : posts.length - 1));
    } else {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 30) return;
    goTo(e.deltaY > 0 ? 'next' : 'prev');
  }, [currentIndex, posts.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 50) {
      goTo(delta > 0 ? 'next' : 'prev');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleLike();
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 800);
    }
    lastTap.current = now;
  };

  const handleLike = async () => {
    if (!currentPost || !user) return;
    setLikeAnimating(true);
    const wasLiked = currentPost.isLiked;
    const prevCount = currentPost.likesCount;

    setPosts((prev) =>
      prev.map((p, i) => i !== currentIndex ? p : { ...p, isLiked: !wasLiked, likesCount: wasLiked ? prevCount - 1 : prevCount + 1 })
    );

    try {
      if (wasLiked) await api.likes.unlike(currentPost.id);
      else await api.likes.like(currentPost.id);
    } catch {
      setPosts((prev) =>
        prev.map((p, i) => i !== currentIndex ? p : { ...p, isLiked: wasLiked, likesCount: prevCount })
      );
    } finally {
      setTimeout(() => setLikeAnimating(false), 300);
    }
  };

  const handleBookmark = async () => {
    if (!currentPost || !user) return;
    const wasBookmarked = currentPost.isBookmarked;

    setPosts((prev) =>
      prev.map((p, i) => i !== currentIndex ? p : { ...p, isBookmarked: !wasBookmarked })
    );

    try {
      await api.bookmarks.toggle(currentPost.id);
    } catch {
      setPosts((prev) =>
        prev.map((p, i) => i !== currentIndex ? p : { ...p, isBookmarked: wasBookmarked })
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') goTo('next');
      if (e.key === 'ArrowUp' || e.key === 'k') goTo('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, posts.length]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto py-2">
        <div className="flex items-center gap-2 px-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#FF3366]" />
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-[#f3f4f6]">Reels</h1>
        </div>
        <div className="aspect-[9/16] w-full max-h-[75vh] rounded-3xl bg-slate-100 dark:bg-[#1a1d23] flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="max-w-md mx-auto py-2">
        <div className="flex items-center gap-2 px-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#FF3366]" />
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-[#f3f4f6]">Reels</h1>
        </div>
        <div className="aspect-[9/16] w-full max-h-[75vh] rounded-3xl bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-8 h-8 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-[#f3f4f6]">No posts to show</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Create a post with an meadia to see it here</p>
          <button onClick={() => fetchPosts()} className="mt-4 text-xs text-[#FF3366] font-medium hover:underline cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-2 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF3366]" />
          <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-[#f3f4f6]">Reels</h1>
        </div>
      </div>

      {/* Reel Viewer */}
      <div
        ref={containerRef}
        className="relative aspect-[9/16] w-full max-h-[75vh] sm:max-h-[80vh] rounded-3xl overflow-hidden bg-black shadow-2xl select-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        {/* Content */}
        {currentPost.mediaUrl ? (
          /\.(mp4|webm|ogg|mov|avi|mkv|quicktime)$/i.test(currentPost.mediaUrl) || currentPost.mediaUrl.includes('video') ? (
            <VideoPlayer src={resolveMediaUrl(currentPost.mediaUrl)} className="w-full h-full" autoPlay muted />
          ) : (
            <img
              src={resolveMediaUrl(currentPost.mediaUrl)}
              alt={currentPost.content}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#FF3366] via-[#FF6B6B] to-[#FFAA00] flex items-center justify-center p-8">
            <p className="text-white text-lg font-bold text-center leading-relaxed">{currentPost.content}</p>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />

        {/* Double tap like heart */}
        {doubleTapLike && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <Heart className="w-20 h-20 fill-white text-white drop-shadow-2xl animate-ping" />
          </div>
        )}

        {/* Right side actions */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-20">
          {/* Like */}
          <button type="button" onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform ${likeAnimating ? 'scale-125' : ''}`}>
              <Heart className={`w-5 h-5 transition-colors ${currentPost.isLiked ? 'fill-[#FF3366] text-[#FF3366]' : 'text-white'}`} />
            </div>
            <span className="text-[11px] text-white font-medium">{currentPost.likesCount}</span>
          </button>

          {/* Comment */}
          <button type="button" onClick={(e) => { e.stopPropagation(); onCommentClick?.(currentPost); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] text-white font-medium">{currentPost.commentsCount}</span>
          </button>

          {/* Bookmark */}
          <button type="button" onClick={(e) => { e.stopPropagation(); handleBookmark(); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Bookmark className={`w-5 h-5 transition-colors ${currentPost.isBookmarked ? 'fill-[#FFAA00] text-[#FFAA00]' : 'text-white'}`} />
            </div>
            <span className="text-[11px] text-white font-medium">Save</span>
          </button>

          {/* Share */}
          <button type="button" onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] text-white font-medium">Share</span>
          </button>
        </div>

        {/* Bottom info */}
        <div className="absolute left-4 right-16 bottom-6 z-10">
          <div
            onClick={(e) => { e.stopPropagation(); onProfileClick(currentPost.author.username || currentPost.author.id); }}
            className="flex items-center gap-2.5 mb-3 cursor-pointer"
          >
            <Avatar src={currentPost.author.image} name={currentPost.author.name || '?'} size="sm" className="w-9 h-9 border-2 border-white" />
            <div>
              <p className="text-sm font-bold text-white drop-shadow-lg">{currentPost.author.name || 'Unknown'}</p>
              <p className="text-[11px] text-white/70">@{currentPost.author.username || 'user'}</p>
            </div>
          </div>
          <p className="text-sm text-white/90 leading-relaxed drop-shadow-lg line-clamp-3">{currentPost.content}</p>
        </div>

        {/* Scroll arrows */}
        <div className="absolute right-3 bottom-[calc(28px+180px)] flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo('prev'); }}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo('next'); }}
            className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <RefreshCw className="w-4 h-4 text-white/60 animate-spin" />
          </div>
        )}
      </div>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        postUrl={window.location.origin + `/?post=${currentPost?.id}`}
        postContent={currentPost?.content || ''}
      />
    </div>
  );
};
