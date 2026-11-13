/**
 * Centralized TypeScript definitions for the ENJ social media platform frontend.
 * Strictly aligned with backend Prisma models and Better Auth session schema.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  username: string | null;
  image?: string | null;
  bio?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Profile {
  id: string;
  username: string | null;
  name: string;
  bio?: string | null;
  image?: string | null;
  bannerUrl?: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  createdAt?: string;
  /** Last time the user was seen online. */
  lastSeenAt?: string | null;
}

export interface PostAuthor {
  id: string;
  name: string;
  username: string | null;
  image?: string | null;
}

export interface Post {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  author: PostAuthor;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  /** True when the signed-in user already follows the author. */
  isFollowingAuthor?: boolean;
  mediaUrl?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  author: PostAuthor;
}

export interface FollowUserItem {
  id: string;
  username: string | null;
  name: string;
  image?: string | null;
  bio?: string | null;
  isFollowing?: boolean;
  followerCount?: number;
  postCount?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

export interface FeedResponse {
  posts: Post[];
  pagination?: Pagination;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination?: Pagination;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface SessionResponse {
  user: User | null;
  session?: {
    id: string;
    userId: string;
    expiresAt: string;
  } | null;
}

export interface Story {
  id: string;
  authorId: string;
  author: PostAuthor;
  mediaUrl?: string | null;
  textContent?: string;
  gradient: string;
  moodEmoji?: string;
  createdAt: string;
  expiresAt: string;
  isViewed?: boolean;
  viewCount?: number;
}

export interface CreateStoryInput {
  textContent?: string;
  mediaUrl?: string | null;
  gradient: string;
  moodEmoji?: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actor?: {
    id: string;
    username: string;
    name: string;
    image?: string | null;
  };
  post?: {
    id: string;
    content: string;
    authorId: string;
    createdAt: string;
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
    mediaUrl?: string | null;
  };
  followStatus?: {
    isFollowing: boolean;
    followerId: string;
  };
}

