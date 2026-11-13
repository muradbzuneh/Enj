/**
 * Home Feed Page for ENJ.
 * Route: /
 * Displays:
 * - 24-hour Stories Carousel (StoryBar) with create & view modal
 * - Interactive Post Composer (with photo upload, emoji picker, tags)
 * - Feed Tabs: "For You" & "Following"
 * - Personalized community post stream
 * Adaptive styling for both Default White (Light) mode and Dark mode.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle, Sparkles, Plus, Users, Compass } from 'lucide-react';
import { StoryBar } from '../../components/story/StoryBar';
import { CreateStoryModal } from '../../components/story/CreateStoryModal';
import { StoryViewerModal } from '../../components/story/StoryViewerModal';
import { PostComposer } from '../../components/post/PostComposer';
import { PostCard } from '../../components/post/PostCard';
import { PostSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import type { Post, Story } from '../../types';

export interface HomeFeedPageProps {
  onProfileClick: (username: string | null) => void;
  onCommentClick: (post: Post) => void;
  onEditClick: (post: Post) => void;
  newlyCreatedPost?: Post | null;
  onHashtagClick?: (tag: string) => void;
}

export const HomeFeedPage: React.FC<HomeFeedPageProps> = ({
  onProfileClick,
  onCommentClick,
  onEditClick,
  newlyCreatedPost,
  onHashtagClick,
}) => {
  const { user } = useAuth();
  const { pendingPostCount, consumePendingPosts } = useSocket();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const feedFilter = activeTab === 'following' ? 'following' : 'all';
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Story modal state
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  const fetchFeedAndStories = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const page = 1;
      const [feedResponse, loadedStories] = await Promise.all([
        api.feed.getPersonalized({ page, limit: 20, filter: feedFilter }),
        api.stories.getStories(),
      ]);
      setPosts(feedResponse.posts);
      setStories(loadedStories);
      hasMoreRef.current = feedResponse.pagination.hasMore;
      pageRef.current = 1;
    } catch (err: any) {
      setError(err?.message || 'Unable to load feed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, feedFilter]);

  useEffect(() => {
    fetchFeedAndStories();
  }, [fetchFeedAndStories]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreRef.current) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await api.feed.getPersonalized({ page: nextPage, limit: 20, filter: feedFilter });
      setPosts((prev) => [...prev, ...res.posts]);
      hasMoreRef.current = res.pagination.hasMore;
      pageRef.current = nextPage;
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, feedFilter]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        loadMore();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  // If a post was created outside (e.g. from modal composer)
  useEffect(() => {
    if (newlyCreatedPost) {
      setPosts((prev) => [newlyCreatedPost, ...prev.filter((p) => p.id !== newlyCreatedPost.id)]);
    }
  }, [newlyCreatedPost]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const handleStoryCreated = (newStory: Story) => {
    setStories((prev) => [newStory, ...prev]);
  };

  const handleOpenStory = (_story: Story, index: number) => {
    setActiveStoryIndex(index);
    setIsViewerOpen(true);
  };

  const handleStoryDeleted = (storyId: string) => {
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  // The backend already scopes the response to the active tab:
  // "for-you" returns every post, "following" only the followed creators.
  const displayedPosts = posts;

  return (
    <div className="space-y-5">
      {/* Top Header Section */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-[#f3f4f6]">
            Home
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            Stories, updates, and community activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateStoryOpen(true)}
            className="gap-1.5 border-[#FF3366]/30 text-[#FF3366] hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-xs font-bold">Add Story</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchFeedAndStories(true)}
            disabled={isLoading || isRefreshing}
            className="gap-1.5 cursor-pointer"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* 24-Hour Stories Carousel */}
      <StoryBar
        stories={stories}
        onOpenStory={handleOpenStory}
        onOpenCreateStory={() => setIsCreateStoryOpen(true)}
      />

      {/* Main Post Composer */}
      <PostComposer onPostCreated={handlePostCreated} />

      {/* Feed Tabs: For You vs Following */}
      <div className="flex border-b border-slate-200/80 dark:border-[#2d333b] px-1 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('for-you')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'for-you'
              ? 'text-[#FF3366]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>For You</span>
          {activeTab === 'for-you' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3366] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('following')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'following'
              ? 'text-[#FF3366]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Following</span>
          {activeTab === 'following' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3366] rounded-full" />
          )}
        </button>
      </div>

      {/* Feed Content Stream */}
      <div className="space-y-4">
        {/* Live: new posts from the people you follow arrived while you were here */}
        {pendingPostCount > 0 && (
          <button
            type="button"
            onClick={() => {
              consumePendingPosts();
              fetchFeedAndStories(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#FF3366] text-white text-xs font-bold py-2.5 shadow-xs hover:bg-[#EE2055] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {pendingPostCount} new post{pendingPostCount > 1 ? 's' : ''} - show now
          </button>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 text-center shadow-xs transition-colors">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">
              Failed to load posts
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFeedAndStories()}
              className="mt-4 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </Button>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-10 text-center shadow-xs space-y-3 transition-colors">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-[#22272e] flex items-center justify-center mx-auto text-[#FF3366]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">
              {activeTab === 'following'
                ? "No posts from followed creators yet"
                : "No posts in your feed yet"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'following'
                ? "Switch to 'For You' or follow creators from the community suggestions on the right."
                : "Publish a thought above or follow other community members to see their posts and stories here."}
            </p>
            {activeTab === 'following' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('for-you')}
                className="mt-2 text-xs"
              >
                Explore For You feed
              </Button>
            )}
          </div>
        ) : (
          displayedPosts.map((post) => (
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

        {isLoadingMore && (
          <div className="py-4 flex justify-center">
            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      {/* Story Viewer Modal */}
      <StoryViewerModal
        isOpen={isViewerOpen}
        stories={stories}
        initialIndex={activeStoryIndex}
        onClose={() => setIsViewerOpen(false)}
        onStoryDeleted={handleStoryDeleted}
      />
    </div>
  );
};
