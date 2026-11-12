/**
 * Create / Publish Story Modal for ENJ.
 * 
 * Allows users to author a 24-hour Story with:
 * - Expressive rich gradients or image background
 * - Drag-and-drop or file upload for photos, plus curated presets and URL input
 * - Custom message / caption
 * - Mood emoji stickers
 * - Live 9:16 mobile story preview
 */

import React, { useState, useRef } from 'react';
import { X, Sparkles, Image as ImageIcon, Check, Palette, Smile, Upload, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import type { Story } from '../../types';

export interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (newStory: Story) => void;
}

const GRADIENT_PRESETS = [
  { id: 'sunset', label: 'Sunset Glow', class: 'from-[#FF3366] via-[#FF5E7E] to-[#FFAA00]' },
  { id: 'aurora', label: 'Midnight Aurora', class: 'from-[#1E1B4B] via-[#4338CA] to-[#06B6D4]' },
  { id: 'peach', label: 'Peach Sorbet', class: 'from-[#FB7185] via-[#F43F5E] to-[#FB923C]' },
  { id: 'emerald', label: 'Emerald Dew', class: 'from-[#047857] via-[#10B981] to-[#34D399]' },
  { id: 'berry', label: 'Berry Velvet', class: 'from-[#701A75] via-[#C026D3] to-[#F472B6]' },
  { id: 'obsidian', label: 'Obsidian Sleek', class: 'from-[#0F172A] via-[#1E293B] to-[#334155]' },
];

const MOOD_EMOJIS = ['✨', '🚀', '🔥', '💡', '☕', '🎨', '💻', '🎧', '🌴', '❤️'];

const PHOTO_PRESETS = [
  { label: 'Workspace', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80' },
  { label: 'Code', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80' },
  { label: 'Architecture', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80' },
  { label: 'Nature', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].class);
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (media)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setMediaUrl(result);
        showToast('Photo attached to story', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim() && !mediaUrl) {
      showToast('Please add a thought or photo to your story', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.stories.create({
        textContent: textContent.trim(),
        mediaUrl: mediaUrl || null,
        gradient: selectedGradient,
        moodEmoji: selectedEmoji,
      });

      showToast('Story published! Live for 24 hours', 'success');
      onStoryCreated(created);
      onClose();
      // Reset form
      setTextContent('');
      setMediaUrl(null);
      setUrlInputValue('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish story', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1a1d23] border border-slate-200 dark:border-[#2d333b] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left / Top: Live Story Preview (9:16 aspect ratio look) */}
        <div className="w-full md:w-64 bg-slate-100 dark:bg-[#121418] p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#2d333b] shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-2.5">
            Live Preview
          </span>

          <div
            className={`w-48 h-80 rounded-2xl relative overflow-hidden shadow-md flex flex-col justify-between p-3.5 bg-gradient-to-tr ${selectedGradient} text-white transition-all`}
          >
            {/* Background image if set */}
            {mediaUrl && (
              <img
                src={resolveMediaUrl(mediaUrl)}
                alt="Story background"
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

            {/* Author bar inside story */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar src={user?.image} name={user?.name || 'You'} size="xs" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate">
                    {user?.name || 'You'}
                  </p>
                  <span className="text-[9px] text-white/80 leading-tight">Just now</span>
                </div>
              </div>

              {selectedEmoji && (
                <span className="text-sm select-none drop-shadow-sm">{selectedEmoji}</span>
              )}
            </div>

            {/* Main story text */}
            <div className="relative z-10 my-auto text-center px-1">
              <p
                className={`font-bold drop-shadow-md break-words ${
                  textContent.length < 50
                    ? 'text-base sm:text-lg leading-snug'
                    : 'text-xs sm:text-sm leading-normal'
                }`}
              >
                {textContent || 'Tap on the right to type your story...'}
              </p>
            </div>

            {/* Footer indicator */}
            <div className="relative z-10 text-center">
              <span className="text-[9px] font-medium tracking-wide text-white/75 uppercase">
                ENJ Story
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls Form */}
        <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#262a32]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF3366] to-[#FFAA00] flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">
                    Create a Story
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Disappears automatically after 24 hours
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#f3f4f6] hover:bg-slate-100 dark:hover:bg-[#22272e] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Text Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Story Thought / Text
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="What's happening right now? Share a milestone, update, or insight..."
                rows={3}
                maxLength={200}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-[#2d333b] bg-slate-50 dark:bg-[#121418] p-3 text-slate-900 dark:text-[#f3f4f6] placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF3366]/40 focus:border-[#FF3366] transition-all resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                {textContent.length}/200
              </div>
            </div>

            {/* Gradient Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#FF3366]" />
                <span>Background Atmosphere</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((grad) => {
                  const isSelected = selectedGradient === grad.class;
                  return (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => setSelectedGradient(grad.class)}
                      className={`h-9 rounded-xl bg-gradient-to-r ${grad.class} flex items-center justify-between px-2.5 text-white text-[11px] font-semibold shadow-xs transition-transform cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-[#FF3366] dark:ring-offset-[#1a1d23] scale-[1.02]'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <span className="truncate">{grad.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Emoji Sticker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-[#FFAA00]" />
                <span>Mood Sticker</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MOOD_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji === selectedEmoji ? '' : emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-transform ${
                      selectedEmoji === emoji
                        ? 'bg-rose-100 dark:bg-rose-950/60 border-2 border-[#FF3366] scale-110'
                        : 'bg-slate-100 dark:bg-[#121418] hover:bg-slate-200 dark:hover:bg-[#22272e]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Attachment with Drag and Drop */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#FF3366]" />
                  <span>Photo Attachment (Optional)</span>
                </label>
                {mediaUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl(null);
                      setUrlInputValue('');
                    }}
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove photo
                  </button>
                )}
              </div>

              {/* Drag-and-drop / upload zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#FF3366] bg-rose-50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-[#2d333b] hover:border-slate-300 dark:hover:border-zinc-600 bg-slate-50/50 dark:bg-[#121418]/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                  <Upload className="w-4 h-4 text-[#FF3366]" />
                  <span className="font-semibold text-slate-900 dark:text-zinc-200">Click to upload</span> or drag & drop photo
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  PNG, JPG, WebP up to 5MB
                </p>
              </div>

              {/* Photo presets or URL */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    Or select a curated preset:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-slate-500 hover:text-[#FF3366] dark:text-zinc-400 flex items-center gap-1 cursor-pointer"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{showUrlInput ? 'Hide URL' : 'Enter URL'}</span>
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={urlInputValue}
                      onChange={(e) => setUrlInputValue(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-[#2d333b] bg-white dark:bg-[#121418] px-3 py-1.5 text-slate-900 dark:text-[#f3f4f6] focus:outline-none focus:ring-1 focus:ring-[#FF3366]"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (urlInputValue.trim()) {
                          setMediaUrl(urlInputValue.trim());
                        }
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {PHOTO_PRESETS.map((p) => {
                    const isSelected = mediaUrl === p.url;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setMediaUrl(isSelected ? null : p.url)}
                        className={`relative h-11 rounded-xl overflow-hidden cursor-pointer transition-all border ${
                          isSelected
                            ? 'border-[#FF3366] ring-2 ring-[#FF3366]/40'
                            : 'border-slate-200 dark:border-[#2d333b] hover:opacity-90'
                        }`}
                      >
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-bold text-white">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-5 border-t border-slate-100 dark:border-[#262a32] flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!textContent.trim() && !mediaUrl)}
              className="inline-flex items-center justify-center font-semibold text-sm px-4 py-2 rounded-xl bg-[#FF3366] hover:bg-[#EE2055] text-white shadow-2xs active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Share to Story'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
