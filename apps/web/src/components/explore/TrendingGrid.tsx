import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Loader2, RefreshCw, Play, Video } from 'lucide-react';
import { api } from '../../services/api';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { MediaImage } from '../post/MediaImage';
import { Avatar } from '../ui/Avatar';
import type { Post } from '../../types';

export interface TrendingGridProps {
  onPostClick: (post: Post) => void;
  /** When provided the grid renders these posts instead of fetching its own. */
  posts?: Post[];
}

const VIDEO_PATTERN = /\.(mp4|webm|ogg|mov|avi|mkv|quicktime)$/i;

function isVideoPost(post: Post): boolean {
  if (!post.mediaUrl) return false;
  return VIDEO_PATTERN.test(post.mediaUrl) || post.mediaUrl.includes('video');
}

export const TrendingGrid: React.FC<TrendingGridProps> = ({ onPostClick, posts: providedPosts }) => {
  const [posts, setPosts] = useState<Post[]>(providedPosts ?? []);
  const [isLoading, setIsLoading] = useState(!providedPosts);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.feed.getTrending(1, 24);
      setPosts(res.posts);
    } catch {
      /* keep whatever we have */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (providedPosts) {
      setPosts(providedPosts);
      setIsLoading(false);
      return;
    }
    fetchPosts();
  }, [providedPosts, fetchPosts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xs text-slate-500 dark:text-zinc-400">No trending posts yet.</p>
        <button
          onClick={fetchPosts}
          className="mt-2 text-xs text-[#FF3366] font-medium hover:underline cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />Retry
        </button>
      </div>
    );
  }

  const mediaCount = posts.filter((p) => p.mediaUrl).length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Trending
        </h3>
        <span className="text-[11px] text-slate-400 dark:text-zinc-500">
          {mediaCount} with media · {posts.length - mediaCount} text
        </span>
      </div>

      {/* Masonry media grid - like a real Explore page: media first, always visible
          engagement counts, author + caption revealed on hover. */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
        {posts.map((post) => {
          const video = isVideoPost(post);

          return (
            <article
              key={post.id}
              onClick={() => onPostClick(post)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPostClick(post);
                }
              }}
              className="group relative mb-2 break-inside-avoid overflow-hidden rounded-xl bg-slate-100 dark:bg-[#22272e] cursor-pointer ring-1 ring-black/5 dark:ring-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3366]"
            >
              {post.mediaUrl ? (
                <>
                  {video ? (
                    <video
                      src={resolveMediaUrl(post.mediaUrl)}
                      className="w-full aspect-[4/5] object-cover bg-black"
                      muted
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                  ) : (
                    <MediaImage
                      src={resolveMediaUrl(post.mediaUrl)}
                      alt={post.content}
                      className="w-full h-auto object-cover"
                    />
                  )}

                  {/* Video badge */}
                  {video && (
                    <span className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm text-white pointer-events-none">
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </span>
                  )}
                </>
              ) : (
                /* Text-only post - rendered as a quote tile, never an empty block. */
                <div className="w-full bg-gradient-to-br from-[#FF3366] via-[#FF5E7E] to-[#FFAA00] p-4">
                  <p className="text-white text-[13px] font-semibold leading-snug line-clamp-5">
                    {post.content || 'Shared a moment on ENJ'}
                  </p>
                </div>
              )}

              {/* Engagement counters - always visible, like a real Explore grid */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                <span className="flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Heart className={`w-3 h-3 ${post.isLiked ? 'fill-[#FF3366] text-[#FF3366]' : 'fill-white'}`} />
                  {post.likesCount}
                </span>
                {post.commentsCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-white">
                    <MessageCircle className="w-3 h-3" />
                    {post.commentsCount}
                  </span>
                )}
              </div>

              {/* Author + caption, revealed on hover */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/55 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar src={post.author.image} name={post.author.name || post.author.username || '?'} size="xs" />
                  <span className="text-[11px] font-bold text-white truncate">
                    {post.author.username
                      ? `@${post.author.username}`
                      : post.author.name || 'Unknown'}
                  </span>
                </div>
                {post.content && (
                  <p className="text-[11px] text-white/90 leading-snug line-clamp-2">{post.content}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
