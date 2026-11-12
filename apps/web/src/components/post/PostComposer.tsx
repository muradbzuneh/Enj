/**
 * Post Composer component for ENJ.
 * Allows authenticated users to author and publish posts with text,
 * attached photos (file upload, drag-and-drop), and hashtag suggestions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, X, UploadCloud, Loader2 } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { uploadFile } from '../../lib/upload';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { API_BASE_URL } from '../../lib/api/client';
import type { Post } from '../../types';

export interface PostComposerProps {
  onPostCreated?: (newPost: Post) => void;
  placeholder?: string;
  initialContent?: string;
}

const MAX_CHAR_LIMIT = 280;

interface HashtagSuggestion {
  tag: string;
  count: number;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  onPostCreated,
  placeholder = "What's on your mind today?",
  initialContent = '',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState(initialContent);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([]);
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const hashtagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hashtagDropdownRef.current && !hashtagDropdownRef.current.contains(e.target as Node)) {
        setShowHashtagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHashtagSuggestions = useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/explore/hashtags?limit=8`
      );
      const data = await res.json();
      const all = data.data || [];
      if (query) {
        const filtered = all.filter((h: HashtagSuggestion) =>
          h.tag.toLowerCase().includes(query.toLowerCase())
        );
        setHashtagSuggestions(filtered.slice(0, 6));
      } else {
        setHashtagSuggestions(all.slice(0, 6));
      }
    } catch {
      setHashtagSuggestions([]);
    }
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (error) setError(null);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const hashtagMatch = textBeforeCursor.match(/#([\w\u0590-\u05FF]*)$/);

    if (hashtagMatch) {
      setHashtagQuery(hashtagMatch[1]);
      setShowHashtagDropdown(true);
      fetchHashtagSuggestions(hashtagMatch[1]);
    } else {
      setShowHashtagDropdown(false);
    }
  };

  const insertHashtag = (tag: string) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    const replaced = textBeforeCursor.replace(/#[\w\u0590-\u05FF]*$/, `#${tag} `);
    setContent(replaced + textAfterCursor);
    setShowHashtagDropdown(false);
    textareaRef.current?.focus();
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-5 text-center shadow-xs transition-colors">
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Sign in to share your thoughts, publish stories, and join the ENJ community.
        </p>
      </div>
    );
  }

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHAR_LIMIT;
  const isEmpty = content.trim().length === 0 && !mediaUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please select an image or video file', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be under 10MB', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const { url } = await uploadFile(file);
      setMediaUrl(url);
      setShowMediaPicker(false);
      showToast('File attached', 'info');
    } catch {
      showToast('Failed to upload file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      showToast('Please drop an image or video file', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const { url } = await uploadFile(file);
      setMediaUrl(url);
      setShowMediaPicker(false);
      showToast('File attached', 'info');
    } catch {
      showToast('Failed to upload file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const createdPost = await api.posts.create(content.trim(), mediaUrl);
      setContent('');
      setMediaUrl(null);
      setShowMediaPicker(false);
      showToast('Post published successfully', 'success');
      onPostCreated?.(createdPost);
    } catch (err: any) {
      const msg = err?.message || 'Failed to publish post. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={handleDrop}
      className={`bg-white dark:bg-[#1a1d23] border ${
        isDraggingFile
          ? 'border-[#FF3366] ring-2 ring-[#FF3366]/20'
          : 'border-slate-200/80 dark:border-[#2d333b]'
      } rounded-2xl p-4 sm:p-5 shadow-xs transition-all relative`}
    >
      {isDraggingFile && (
        <div className="absolute inset-0 bg-white/95 dark:bg-[#1a1d23]/95 rounded-2xl z-20 flex flex-col items-center justify-center pointer-events-none text-[#FF3366]">
          <UploadCloud className="w-10 h-10 animate-bounce mb-1" />
          <p className="text-xs font-bold">Drop photo to attach to post</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3.5">
          <Avatar src={user.image} name={user.name || user.username} size="md" />

          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              id="post-composer-textarea"
              rows={3}
              value={content}
              onChange={handleContentChange}
              placeholder={placeholder}
              className="w-full text-sm text-slate-900 dark:text-[#f3f4f6] placeholder:text-slate-400 dark:placeholder:text-zinc-500 bg-transparent border-none outline-none resize-none leading-relaxed p-0 focus:ring-0"
              disabled={isSubmitting}
            />

            {/* Hashtag suggestion dropdown */}
            {showHashtagDropdown && hashtagSuggestions.length > 0 && (
              <div
                ref={hashtagDropdownRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-xl shadow-lg z-30 py-1 max-h-48 overflow-y-auto"
              >
                <p className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                  Suggested hashtags
                </p>
                {hashtagSuggestions.map((tag) => (
                  <button
                    key={tag.tag}
                    type="button"
                    onClick={() => insertHashtag(tag.tag)}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#22272e] transition-colors cursor-pointer text-left"
                  >
                    <span className="text-sm font-medium text-[#FF3366]">
                      {tag.tag}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {tag.count} posts
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Attached media preview */}
            {mediaUrl && (
              <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200/80 dark:border-[#2d333b] max-h-64 bg-slate-100 dark:bg-black/30 group">
                <img
                  src={resolveMediaUrl(mediaUrl)}
                  alt="Attached preview"
                  className="w-full h-auto object-cover max-h-64"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setMediaUrl(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Photo preset / attachment drawer */}
            {showMediaPicker && (
              <div className="mt-2.5 p-3 bg-slate-50 dark:bg-[#22272e] rounded-xl border border-slate-200/80 dark:border-[#2d333b] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Attach a photo</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#FF3366] font-bold hover:underline cursor-pointer"
                  >
                    Upload from device
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-rose-500 font-medium mt-2">{error}</p>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#262a32] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowMediaPicker((prev) => !prev)}
                  disabled={isUploading}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    showMediaPicker || mediaUrl
                      ? 'text-[#FF3366] bg-rose-50 dark:bg-rose-950/30'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#22272e]'
                  }`}
                  title="Attach image or video"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Image className="w-8 h-6" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs ${
                    isOverLimit
                      ? 'text-rose-500 font-bold'
                      : charCount > MAX_CHAR_LIMIT - 30
                      ? 'text-amber-500 font-medium'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {charCount} / {MAX_CHAR_LIMIT}
                </span>

                <Button
                  id="submit-post-btn"
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isEmpty || isOverLimit || isSubmitting}
                  isLoading={isSubmitting}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
