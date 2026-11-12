import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { MediaImage } from '../post/MediaImage';
import type { Post } from '../../types';

export interface TrendingGridProps {
  onPostClick: (post: Post) => void;
}

export const TrendingGrid: React.FC<TrendingGridProps> = ({ onPostClick }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.feed.getTrending(1, 20);
      setPosts(res.posts);
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xs text-slate-500 dark:text-zinc-400">No trending posts yet.</p>
        <button onClick={fetchPosts} className="mt-2 text-xs text-[#FF3366] font-medium hover:underline cursor-pointer">
          <RefreshCw className="w-3 h-3 inline mr-1" />Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
        Trending Posts
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onPostClick(post)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#22272e] group cursor-pointer"
          >
            {post.mediaUrl ? (
              <MediaImage
                src={resolveMediaUrl(post.mediaUrl)}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#FF3366] via-[#FF5E7E] to-[#FFAA00] flex items-center justify-center p-3">
                <p className="text-white text-xs font-bold text-center line-clamp-3">{post.content}</p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-[#FF3366] text-[#FF3366]' : 'text-white'}`} />
              <span className="text-[11px] text-white font-medium">{post.likesCount}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
