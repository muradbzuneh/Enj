/**
 * Interactive Search Page for ENJ.
 * Route: /search
 * Supports real-time querying across posts, topics/hashtags, and user profiles.
 * Adaptive styling for both Default Light (White) mode and Dark mode.
 */

import React, { useState, useEffect } from 'react';
import { Search, User, MessageSquare, Hash } from 'lucide-react';
import { PostCard } from '../../components/post/PostCard';
import { Avatar } from '../../components/ui/Avatar';
import { FollowButton } from '../../components/profile/FollowButton';
import { api } from '../../services/api';
import type { Post, User as UserType, FollowUserItem } from '../../types';

export interface SearchPageProps {
  initialQuery?: string;
  onProfileClick: (username: string | null) => void;
  onCommentClick: (post: Post) => void;
  onEditClick: (post: Post) => void;
  onHashtagClick?: (tag: string) => void;
}

const POPULAR_TAGS = ['#TypeScript', '#ModernDesign', '#ENJStories', '#React', '#WebDev', '#CleanCode'];

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  onProfileClick,
  onCommentClick,
  onEditClick,
  onHashtagClick,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'people'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<(UserType & { followerCount?: number; isFollowing?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let isCancelled = false;
    const executeSearch = async () => {
      if (!query.trim()) {
        setPosts([]);
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await api.search.query(query);
        if (!isCancelled) {
          setPosts(result.posts);
          setUsers(result.users.map((u) => ({ ...u, isFollowing: false })));
        }
      } catch (err) {
        console.warn('Search query error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(executeSearch, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handlePostUpdated = (updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (deletedId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedId));
  };

  const cleanQuery = query.trim();
  const hasResults = posts.length > 0 || users.length > 0;

  return (
    <div className="space-y-5">
      {/* Search Bar Input */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 transition-colors">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            id="search-page-input"
            type="search"
            autoFocus
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-200 dark:border-[#2d333b] bg-slate-50 dark:bg-[#121418] pl-10 pr-4 py-2.5 text-slate-900 dark:text-[#f3f4f6] placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-2 focus:ring-[#FF3366]/30 focus:border-[#FF3366] transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs if query is active */}
      {cleanQuery && (
        <div className="flex items-center gap-1 bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] p-1.5 rounded-2xl shadow-2xs transition-colors">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 text-xs py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f3f4f6]'
            }`}
          >
            All Results ({posts.length + users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`flex-1 text-xs py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'posts'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f3f4f6]'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`flex-1 text-xs py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'people'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-[#f3f4f6]'
            }`}
          >
            People ({users.length})
          </button>
        </div>
      )}

      {/* Results View */}
      <div className="space-y-4">
        {!cleanQuery ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-12 text-center shadow-xs space-y-2 transition-colors">
            <Search className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">Search ENJ Network</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
              Find thoughts, discussions, stories, hashtags, and connect with developers and creators.
            </p>
          </div>
        ) : !hasResults ? (
          <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-10 text-center shadow-xs space-y-2 transition-colors">
            <p className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6]">No results found for "{cleanQuery}"</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Try searching for broader keywords like "React", "design", or usernames.</p>
          </div>
        ) : (
          <>
            {/* People Section (shown in All or People tab) */}
            {(activeTab === 'all' || activeTab === 'people') && users.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <User className="w-3.5 h-3.5 text-[#FF3366]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    People ({users.length})
                  </h3>
                </div>

                <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl divide-y divide-slate-100 dark:divide-[#262a32] overflow-hidden shadow-xs transition-colors">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => onProfileClick(user.id)}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#22272e] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar src={user.image} name={user.name} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] truncate hover:underline">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500">@{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-1 max-w-md">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <FollowButton userId={user.id} initialIsFollowing={user.isFollowing} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Section (shown in All or Posts tab) */}
            {(activeTab === 'all' || activeTab === 'posts') && posts.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 px-1">
                  <MessageSquare className="w-3.5 h-3.5 text-[#FFAA00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Posts ({posts.length})
                  </h3>
                </div>

                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onProfileClick={onProfileClick}
                      onCommentClick={onCommentClick}
                      onEditClick={onEditClick}
                      onPostUpdated={handlePostUpdated}
                      onPostDeleted={handlePostDeleted}
                      onHashtagClick={onHashtagClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
