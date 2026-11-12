import React, { useState, useEffect, useCallback } from 'react';
import { Compass, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { PostCard } from '../../components/post/PostCard';
import { PostSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { TrendingGrid } from '../../components/explore/TrendingGrid';
import { SuggestedUsersRow } from '../../components/explore/SuggestedUsersRow';
import { HashtagCloud } from '../../components/explore/HashtagCloud';
import { api } from '../../services/api';
import type { Post } from '../../types';

export interface ExplorePageProps {
  onProfileClick: (username: string | null) => void;
  onCommentClick: (post: Post) => void;
  onEditClick: (post: Post) => void;
  onNavigate: (path: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onProfileClick,
  onCommentClick,
  onEditClick,
  onNavigate,
  onHashtagClick,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'trending' | 'recent'>('trending');

  const fetchExplorePosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res =
        activeFilter === 'trending'
          ? await api.feed.getTrending(1, 30)
          : await api.posts.getPosts(1, 30);
      setPosts(res.posts);
    } catch (err: any) {
      setError(err?.message || 'Unable to load trending posts.');
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#FF3366] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-[#f3f4f6]">Explore</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Discover content across ENJ</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121418] border border-slate-200/80 dark:border-[#2d333b] p-1 rounded-xl">
            <button type="button" onClick={() => setActiveFilter('trending')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${activeFilter === 'trending' ? 'bg-white dark:bg-[#1a1d23] text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400'}`}>
              Trending
            </button>
            <button type="button" onClick={() => setActiveFilter('recent')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${activeFilter === 'recent' ? 'bg-white dark:bg-[#1a1d23] text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-zinc-400'}`}>
              Latest
            </button>
          </div>
        </div>
      </div>

      {/* Creators to follow - the primary way to discover and engage with people */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 shadow-xs transition-colors">
        <SuggestedUsersRow onProfileClick={(id) => onNavigate(`/profile/${id}`)} />
      </div>

      {/* Media-first trending grid */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 shadow-xs transition-colors">
        <TrendingGrid
          posts={activeFilter === 'trending' ? posts : undefined}
          onPostClick={(post) => onCommentClick(post)}
        />
      </div>

      {/* Hashtags */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 shadow-xs transition-colors">
        <HashtagCloud onHashtagClick={(tag) => onNavigate(`/search?q=${encodeURIComponent(tag)}`)} />
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
          {activeFilter === 'trending' ? 'Trending Posts' : 'Recent Posts'}
        </h3>
        {isLoading ? (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 text-center shadow-xs transition-colors">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">Failed to load</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchExplorePosts} className="mt-4 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-10 text-center shadow-xs transition-colors">
            <TrendingUp className="w-8 h-8 text-[#FF3366] mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">No posts yet</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Check back soon.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
              onProfileClick={onProfileClick}
              onCommentClick={onCommentClick}
              onEditClick={onEditClick}
              onHashtagClick={onHashtagClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
