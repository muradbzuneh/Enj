import { apiClient } from "@/lib/api/client";
import type { Post } from "@/types";

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

function extractPosts(res: unknown): Post[] {
  if (!res || typeof res !== "object") return [];
  const record = res as Record<string, unknown>;
  const data = record["data"];
  if (Array.isArray(data)) return data.map(normalizePost);
  return [];
}

function extractPagination(res: unknown, fallbackPage: number, fallbackLimit: number) {
  if (!res || typeof res !== "object") return { page: fallbackPage, limit: fallbackLimit, hasMore: false };
  const record = res as Record<string, unknown>;
  const p = record["pagination"] as Record<string, unknown> | undefined;
  const page = (p?.["page"] as number) ?? fallbackPage;
  const limit = (p?.["limit"] as number) ?? fallbackLimit;
  const total = p?.["total"] as number | undefined;
  const hasNext = (p?.["hasNextPage"] as boolean) ?? (total !== undefined ? page * limit < total : false);
  return { page, limit, hasMore: hasNext, total };
}

export type FeedFilter = "all" | "following";

export const feedService = {
  /**
   * `filter="all"` returns every post on the platform ("For You" tab).
   * `filter="following"` returns only posts from people the user follows.
   */
  async getPersonalized(
    pageOrOpts:
      | number
      | { page?: number; limit?: number; filter?: FeedFilter },
    limit?: number,
    filter: FeedFilter = "all",
  ): Promise<{ posts: Post[]; items: Post[]; pagination: ReturnType<typeof extractPagination> }> {
    const page = typeof pageOrOpts === "number" ? pageOrOpts : (pageOrOpts.page ?? 1);
    const effectiveLimit = typeof pageOrOpts === "number" ? (limit ?? 20) : (pageOrOpts.limit ?? 20);
    const effectiveFilter =
      typeof pageOrOpts === "number" ? filter : (pageOrOpts.filter ?? filter);
    const res = await apiClient.get("/api/feed", {
      page,
      limit: effectiveLimit,
      filter: effectiveFilter,
    });
    const posts = extractPosts(res);
    const pagination = extractPagination(res, page, effectiveLimit);
    return { posts, items: posts, pagination };
  },

  async getTrending(
    pageOrOpts: number | { page?: number; limit?: number },
    limit?: number,
  ): Promise<{ posts: Post[]; items: Post[]; pagination: ReturnType<typeof extractPagination> }> {
    const page = typeof pageOrOpts === "number" ? pageOrOpts : (pageOrOpts.page ?? 1);
    const effectiveLimit = typeof pageOrOpts === "number" ? (limit ?? 20) : (pageOrOpts.limit ?? 20);
    const res = await apiClient.get("/api/posts/trending", { page, limit: effectiveLimit });
    const posts = extractPosts(res);
    const pagination = extractPagination(res, page, effectiveLimit);
    return { posts, items: posts, pagination };
  },

  async getLiked(
    pageOrOpts: number | { page?: number; limit?: number },
    limit?: number,
  ): Promise<{ posts: Post[]; items: Post[]; pagination: ReturnType<typeof extractPagination> }> {
    const page = typeof pageOrOpts === "number" ? pageOrOpts : (pageOrOpts.page ?? 1);
    const effectiveLimit = typeof pageOrOpts === "number" ? (limit ?? 20) : (pageOrOpts.limit ?? 20);
    const res = await apiClient.get("/api/posts/liked", { page, limit: effectiveLimit });
    const posts = extractPosts(res);
    const pagination = extractPagination(res, page, effectiveLimit);
    return { posts, items: posts, pagination };
  },
};
