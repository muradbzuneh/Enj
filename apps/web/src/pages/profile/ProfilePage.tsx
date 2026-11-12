/**
 * User Profile Page for ENJ.
 * Route: /profile/:username
 * Shows: Gradient banner, avatar, name, bio, stats, posts, follow button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, ArrowLeft, Heart, MessageSquare, Flame, Camera } from 'lucide-react';
import { FollowListModal } from '../../components/profile/FollowListModal';
import { FollowButton } from '../../components/profile/FollowButton';
import { PostCard } from '../../components/post/PostCard';
import { MediaImage } from '../../components/post/MediaImage';
import { StoryViewerModal } from '../../components/story/StoryViewerModal';
import { ProfileSkeleton, PostSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { uploadFile } from '../../lib/upload';
import type { Profile, Post, Story } from '../../types';

export interface ProfilePageProps {
  username: string;
  onNavigate: (path: string) => void;
  onCommentClick: (post: Post) => void;
  onEditClick: (post: Post) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  username,
  onNavigate,
  onCommentClick,
  onEditClick,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  const cleanUsername = username.replace(/^@/, '');
  const isOwnProfile = user && profile && user.id === profile.id;

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await api.users.getProfile(cleanUsername);
      setProfile(p);

      const [feedRes, allStories] = await Promise.all([
        // Ask the API for this author's posts directly - filtering the global
        // feed in the browser dropped every post outside the first page.
        api.posts.getPosts({ page: 1, limit: 30, author: cleanUsername }),
        api.stories.getStories(),
      ]);

      setUserPosts(feedRes.posts);

      const stories = allStories.filter(
        (s) => s.authorId === p.id
      );
      setUserStories(stories);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user profile.');
    } finally {
      setIsLoading(false);
    }
  }, [cleanUsername]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleFollowChange = (isFollowing: boolean) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing,
            followerCount: isFollowing ? prev.followerCount + 1 : Math.max(0, prev.followerCount - 1),
          }
        : null
    );
    setTimeout(() => fetchProfileData(), 500);
  };

  const handlePostUpdated = (updated: Post) => {
    setUserPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (deletedId: string) => {
    setUserPosts((prev) => prev.filter((p) => p.id !== deletedId));
    setProfile((prev) => (prev ? { ...prev, postCount: Math.max(0, prev.postCount - 1) } : null));
  };

  const handleOpenStory = (index: number) => {
    setSelectedStoryIndex(index);
    setIsViewerOpen(true);
  };

  const handleMessageClick = async () => {
    if (!profile) return;
    try {
      const conv = await api.messages.createConversation(profile.id);
      onNavigate(`/messages/${conv.id}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to start conversation', 'error');
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }
    setIsUploadingBanner(true);
    try {
      const { url } = await uploadFile(file);
      await api.users.updateProfile({ bannerUrl: url } as any);
      setProfile((prev) => (prev ? { ...prev, bannerUrl: url } : null));
      showToast('Banner updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to upload banner', 'error');
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ProfileSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white dark:bg-[#1a1d23] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 text-center shadow-xs transition-colors">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900 dark:text-[#f3f4f6]">Profile not found</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">{error || 'User not found'}</p>
        <Button variant="outline" size="sm" onClick={fetchProfileData} className="mt-4 gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Profile Banner + Header */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl overflow-hidden shadow-xs transition-colors">
        {/* Gradient Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-[#FF3366] via-[#FF6B6B] to-[#FFAA00] relative">
          {profile.bannerUrl && (
            <img src={resolveMediaUrl(profile.bannerUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
          {isOwnProfile && (
            <>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors cursor-pointer z-10"
                title="Change banner"
              >
                {isUploadingBanner ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Avatar + Info */}
        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex items-end justify-between mb-4">
            <Avatar
              src={profile.image}
              name={profile.name || profile.username || '?'}
              size="lg"
              className="w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl border-4 border-white dark:border-[#1a1d23] shadow-lg"
            />

            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/settings/profile')}
                >
                  Edit profile
                </Button>
              ) : (
                <>
                  <FollowButton
                    userId={profile.id}
                    initialIsFollowing={profile.isFollowing}
                    onFollowChange={handleFollowChange}
                    size="md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMessageClick}
                    className="gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Message</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + Username + Bio */}
          <div className="space-y-2">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#f3f4f6]">
                {profile.name || profile.username}
              </h1>
              {profile.username && (
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  @{profile.username}
                </p>
              )}
            </div>

            {profile.bio && (
              <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-5 pt-2">
              <button
                type="button"
                className="cursor-pointer group"
              >
                <span className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] group-hover:text-[#FF3366] transition-colors">
                  {profile.postCount}
                </span>
                <span className="text-sm text-slate-500 dark:text-zinc-400 ml-1">
                  Posts
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFollowModalType('followers')}
                className="cursor-pointer group"
              >
                <span className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] group-hover:text-[#FF3366] transition-colors">
                  {profile.followerCount}
                </span>
                <span className="text-sm text-slate-500 dark:text-zinc-400 ml-1">
                  Followers
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFollowModalType('following')}
                className="cursor-pointer group"
              >
                <span className="text-sm font-bold text-slate-900 dark:text-[#f3f4f6] group-hover:text-[#FF3366] transition-colors">
                  {profile.followingCount}
                </span>
                <span className="text-sm text-slate-500 dark:text-zinc-400 ml-1">
                  Following
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1a1d23] border border-slate-200/80 dark:border-[#2d333b] rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="flex border-b border-slate-200/80 dark:border-[#2d333b]">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`flex-1 pb-3 pt-4 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'posts'
                ? 'text-[#FF3366]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Posts</span>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3366] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stories')}
            className={`flex-1 pb-3 pt-4 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stories'
                ? 'text-[#FF3366]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Stories</span>
            {activeTab === 'stories' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3366] rounded-full" />
            )}
          </button>
        </div>

        {/* Posts Tab - media grid, like every real profile page */}
        {activeTab === 'posts' && (
          <div className="p-4">
            {userPosts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                <p className="text-xs">No posts yet.</p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 gap-2">
                {userPosts.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onCommentClick(post)}
                    className="group relative mb-2 break-inside-avoid w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#22272e] cursor-pointer ring-1 ring-black/5 dark:ring-white/5 text-left"
                  >
                    {post.mediaUrl ? (
                      <MediaImage
                        src={resolveMediaUrl(post.mediaUrl)}
                        alt={post.content}
                        className="w-full h-auto object-cover"
                      />
                    ) : (
                      <div className="w-full bg-gradient-to-br from-[#FF3366] via-[#FF5E7E] to-[#FFAA00] p-3">
                        <p className="text-white text-[12px] font-semibold leading-snug line-clamp-4">
                          {post.content}
                        </p>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-white">
                        <Heart className="w-3 h-3 fill-white" />
                        {post.likesCount}
                      </span>
                      {post.commentsCount > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold text-white">
                          <MessageSquare className="w-3 h-3" />
                          {post.commentsCount}
                        </span>
                      )}
                    </div>

                    {/* Caption on hover */}
                    {post.content && (
                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] text-white/90 line-clamp-2">{post.content}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stories Tab */}
        {activeTab === 'stories' && (
          <div className="p-4">
            {userStories.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                <p className="text-xs">No active stories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userStories.map((story, idx) => (
                  <div
                    key={story.id}
                    onClick={() => handleOpenStory(idx)}
                    className={`relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br ${story.gradient} p-3.5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md group`}
                  >
                    {story.mediaUrl && (
                      <img
                        src={resolveMediaUrl(story.mediaUrl)}
                        alt="Story visual"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    <div className="relative z-10 flex justify-between items-center">
                      <span className="text-lg drop-shadow">{story.moodEmoji || '✨'}</span>
                      <span className="text-[10px] text-white/80 font-medium px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-xs">
                        Active
                      </span>
                    </div>
                    {story.textContent && (
                      <div className="relative z-10 bg-black/40 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                        <p className="text-white text-xs font-medium line-clamp-3 leading-snug">
                          {story.textContent}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {followModalType && (
        <FollowListModal
          isOpen={Boolean(followModalType)}
          type={followModalType}
          userId={profile.id}
          onClose={() => setFollowModalType(null)}
          onUserClick={(userId) => {
            if (userId) onNavigate(`/profile/${userId}`);
          }}
        />
      )}

      <StoryViewerModal
        isOpen={isViewerOpen}
        stories={userStories}
        initialIndex={selectedStoryIndex}
        onClose={() => setIsViewerOpen(false)}
        onStoryDeleted={(id) => setUserStories((prev) => prev.filter((s) => s.id !== id))}
      />
    </div>
  );
};
