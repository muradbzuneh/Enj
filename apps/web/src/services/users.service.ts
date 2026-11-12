import { apiClient } from "@/lib/api/client";
import type { Profile, Post, FollowUserItem } from "@/types";
import type { UpdateProfileInput, Paginated } from "@/types/api";

interface BackendProfile {
  id: string;
  name: string;
  username: string;
  bio?: string | null;
  image?: string | null;
  bannerUrl?: string | null;
  createdAt?: string;
  _count?: { posts: number; followers: number; following: number };
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

function normalizeProfile(data: BackendProfile, extra?: Partial<Profile>): Profile {
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    bio: data.bio ?? null,
    image: data.image ?? null,
    bannerUrl: data.bannerUrl ?? null,
    postCount: data._count?.posts ?? 0,
    followerCount: data._count?.followers ?? 0,
    followingCount: data._count?.following ?? 0,
    isFollowing: data.isFollowing ?? false,
    isOwnProfile: data.isOwnProfile ?? false,
    createdAt: data.createdAt,
    ...extra,
  };
}

interface BackendPost {
  id: string;
  content: string;
  mediaUrl?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  author: { id: string; name: string; username: string | null; image?: string | null };
  _count?: { comments: number; likes: number };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

function normalizePost(data: BackendPost): Post {
  return {
    id: data.id,
    content: data.content,
    mediaUrl: data.mediaUrl ?? null,
    authorId: data.authorId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    author: data.author,
    likesCount: data._count?.likes ?? 0,
    commentsCount: data._count?.comments ?? 0,
    isLiked: data.isLiked ?? false,
    isBookmarked: data.isBookmarked ?? false,
  };
}

export const usersService = {
  async getProfile(identifier: string): Promise<Profile> {
    const res = await apiClient.get<{ data: BackendProfile }>(`/api/user/${identifier}`);
    return normalizeProfile(res.data);
  },

  async getFollowing(userId: string): Promise<FollowUserItem[]> {
    const res = await apiClient.get<{ data: FollowUserItem[] }>(`/api/user/${userId}/following`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getFollowers(userId: string): Promise<FollowUserItem[]> {
    const res = await apiClient.get<{ data: FollowUserItem[] }>(`/api/user/${userId}/followers`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async follow(userId: string): Promise<void> {
    await apiClient.post(`/api/users/${userId}/follow`);
  },

  async unfollow(userId: string): Promise<void> {
    await apiClient.delete(`/api/users/${userId}/follow`);
  },

  async getPosts(
    identifier: string,
    opts?: { page?: number; limit?: number },
  ): Promise<Paginated<Post>> {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    // The API filters by author server-side - filtering the whole feed in the
    // browser silently dropped every post outside the first page.
    const res = await apiClient.get<{
      data: BackendPost[];
      pagination: { total: number; hasNextPage: boolean };
    }>("/api/posts", { page, limit, author: identifier });
    const posts = Array.isArray(res.data) ? res.data.map(normalizePost) : [];
    return {
      items: posts,
      pagination: {
        page,
        limit,
        hasMore: res.pagination?.hasNextPage ?? false,
        total: res.pagination?.total,
      },
    };
  },

  async followers(identifier: string): Promise<FollowUserItem[]> {
    const profile = await this.getProfile(identifier);
    return this.getFollowers(profile.id);
  },

  async following(identifier: string): Promise<FollowUserItem[]> {
    const profile = await this.getProfile(identifier);
    return this.getFollowing(profile.id);
  },

  async updateProfile(input: UpdateProfileInput): Promise<Profile> {
    const res = await apiClient.patch<{ data: BackendProfile }>("/api/profile", input);
    return normalizeProfile(res.data);
  },

  async getSuggestions(): Promise<FollowUserItem[]> {
    const res = await apiClient.get<{
      data: (BackendProfile & { followerCount?: number; postCount?: number })[];
    }>("/api/suggestions");
    return (res.data || []).map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image ?? null,
      bio: u.bio ?? null,
      isFollowing: u.isFollowing ?? false,
      followerCount: u.followerCount ?? 0,
      postCount: u.postCount ?? 0,
    }));
  },
};
