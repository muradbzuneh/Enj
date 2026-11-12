/**
 * Profile Settings Page for ENJ.
 * Route: /settings/profile
 * Features: Upload photo, display name, username, bio, sign out, save changes
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, AlertCircle, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { uploadFile } from '../../lib/upload';

export interface SettingsProfilePageProps {
  onNavigate: (path: string) => void;
}

const MAX_BIO_LENGTH = 160;

export const SettingsProfilePage: React.FC<SettingsProfilePageProps> = ({ onNavigate }) => {
  const { user, updateCurrentUser, signOut } = useAuth();
  const { showToast } = useToast();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setImageUrl(user.image || '');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-10 text-center shadow-xs transition-colors">
        <h2 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">Please sign in</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          You must be logged in to modify your settings.
        </p>
        <Button variant="primary" size="sm" onClick={() => onNavigate('/login')} className="mt-4">
          Go to Sign in
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername) {
      setError('Username is required.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError('Username can only contain lowercase letters, numbers, and underscores.');
      return;
    }

    if (bio.length > MAX_BIO_LENGTH) {
      setError(`Bio cannot exceed ${MAX_BIO_LENGTH} characters.`);
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await api.users.updateProfile({
        username: cleanUsername,
        name: name.trim(),
        bio: bio.trim(),
        image: imageUrl.trim() || undefined,
      });

      updateCurrentUser({
        username: updatedProfile.username,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        image: updatedProfile.image,
      });
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-[#f3f4f6]">
          Profile settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          How you appear across Enj
        </p>
      </div>

      {/* Avatar / Photo Section */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex items-start gap-6">
          <div className="relative group">
            <Avatar
              src={imageUrl || user.image}
              name={user.name || user.username}
              size="lg"
              className="w-20 h-20 text-2xl"
            />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload photo'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageUrl('')}
                className="text-slate-500 hover:text-rose-500"
              >
                Remove
              </Button>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-1">
                ...or paste an image URL
              </p>
              <Input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                PNG, JPG, WebP or GIF up to 4 MB.
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
              showToast('Image must be under 4 MB', 'error');
              return;
            }
            setIsUploading(true);
            try {
              const result = await uploadFile(file);
              setImageUrl(result.url);
            } catch (err: any) {
              showToast(err?.message || 'Upload failed', 'error');
            } finally {
              setIsUploading(false);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Display name
          </label>
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-sm">
              @
            </span>
            <Input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={30}
              className="pl-8"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
            Bio
          </label>
          <Textarea
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO_LENGTH}
            rows={3}
            className="resize-none"
          />
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 text-right">
            {MAX_BIO_LENGTH - bio.length} characters left
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
          >
            Sign out
          </button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            className="px-6"
          >
            Save changes
          </Button>
        </div>
      </form>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl p-6 shadow-xs transition-colors">
        <h2 className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] mb-4">Appearance</h2>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#22272e] flex items-center justify-center">
              {resolvedTheme === 'system' ? (
                <Monitor className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-[#f3f4f6]">
                {theme === 'system'
                  ? 'System theme'
                  : theme === 'dark'
                    ? 'Dark mode'
                    : 'Light mode'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                {theme === 'system'
                  ? 'Follows your device setting'
                  : 'Switch between light and dark themes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              resolvedTheme === 'dark' ? 'bg-[#FF3366]' : 'bg-slate-300 dark:bg-[#3a4150]'
            }`}
            aria-label="Cycle theme"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Explicit three-way picker */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ] as const).map((option) => {
            const Icon = option.icon;
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'border-[#FF3366] bg-rose-50 dark:bg-rose-950/30 text-[#FF3366]'
                    : 'border-slate-200 dark:border-[#2d333b] text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#22272e]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
