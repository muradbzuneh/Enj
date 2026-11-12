import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface MediaImageProps {
  src: string;
  alt?: string;
  className?: string;
}

/**
 * Image that degrades gracefully when the file is gone.
 *
 * Media can disappear when the backend runs on an ephemeral filesystem (Heroku
 * restarts wipe the local uploads folder) - instead of a broken image icon we
 * show a neutral placeholder.
 */
export const MediaImage: React.FC<MediaImageProps> = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`w-full h-full min-h-[120px] flex items-center justify-center gap-2 bg-slate-100 dark:bg-[#1a1d23] text-slate-400 dark:text-zinc-500 text-xs ${className ?? ''}`}
      >
        <ImageOff className="w-4 h-4" />
        <span>Media unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};
