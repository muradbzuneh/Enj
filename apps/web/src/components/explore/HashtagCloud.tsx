import React, { useState, useEffect } from 'react';
import { Hash, Loader2, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface HashtagItem {
  tag: string;
  count: number;
}

export interface HashtagCloudProps {
  onHashtagClick: (tag: string) => void;
}

export const HashtagCloud: React.FC<HashtagCloudProps> = ({ onHashtagClick }) => {
  const [hashtags, setHashtags] = useState<HashtagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiClient.get<{ data: HashtagItem[] }>("/api/explore/hashtags");
        if (mounted) setHashtags(res.data || []);
      } catch {} finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (hashtags.length === 0) return null;

  const maxCount = Math.max(...hashtags.map((h) => h.count));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 px-1">
        <TrendingUp className="w-3.5 h-3.5 text-[#FF3366]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          Trending Now
        </h3>
      </div>
      <div className="space-y-1">
        {hashtags.slice(0, 8).map((h, i) => (
          <button
            key={h.tag}
            type="button"
            onClick={() => onHashtagClick(h.tag)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#22272e] transition-colors cursor-pointer group text-left"
          >
            <span className="text-xs font-bold text-slate-300 dark:text-zinc-600 w-5 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#FF3366] group-hover:underline">
                #{h.tag}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-[#2d333b] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF3366] to-[#FFAA00] transition-all"
                    style={{ width: `${(h.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                  {h.count} {h.count === 1 ? 'post' : 'posts'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
