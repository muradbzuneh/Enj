import { apiClient } from "@/lib/api/client";
import type { Post } from "@/types";

interface BackendPost {
  id: string;
  content: string;
  mediaUrl?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
  author: { id: string; name: string; username: string; image?: string | null };
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

function extractPagination(res: unknown) {
  if (!res || typeof res !== "object") return { page: 1, limit: 20, hasMore: false };
  const record = res as Record<string, unknown>;
  const p = record["pagination"] as Record<string, unknown> | undefined;
  const page = (p?.["page"] as number) ?? 1;
  const limit = (p?.["limit"] as number) ?? 20;
  const total = p?.["total"] as number | undefined;
  const hasNext = (p?.["hasNextPage"] as boolean) ?? (total !== undefined ? page * limit < total : false);
  return { page, limit, hasMore: hasNext, total };
}

export const postsService = {
  /**
   * @param page   page number
   * @param limit  page size
   * @param author restrict to one author (user id or username)
   */
  async getPosts(
    pageOrOpts: number | { page?: number; limit?: number; author?: string },
    limit = 20,
  ): Promise<{ posts: Post[]; items: Post[]; pagination: ReturnType<typeof extractPagination> }> {
    const page = typeof pageOrOpts === "number" ? pageOrOpts : (pageOrOpts.page ?? 1);
    const effectiveLimit =
      typeof pageOrOpts === "number" ? limit : (pageOrOpts.limit ?? 20);
    const author = typeof pageOrOpts === "number" ? undefined : pageOrOpts.author;

    const res = await apiClient.get("/api/posts", {
      page,
      limit: effectiveLimit,
      ...(author ? { author } : {}),
    });
    const posts = extractPosts(res);
    const pagination = extractPagination(res, page, effectiveLimit);
    return { posts, items: posts, pagination };
  },

  async create(
    contentOrObj: string | { content: string },
    mediaUrl?: string | null,
  ): Promise<Post> {
    const content = typeof contentOrObj === "string" ? contentOrObj : contentOrObj.content;
    const res = await apiClient.post<{ data: BackendPost }>("/api/posts", { content, mediaUrl: mediaUrl || null });
    return normalizePost(res.data);
  },

  async update(
    id: string,
    contentOrObj: string | { content: string },
    mediaUrl?: string | null,
  ): Promise<Post> {
    const content = typeof contentOrObj === "string" ? contentOrObj : contentOrObj.content;
    const res = await apiClient.patch<{ data: BackendPost }>(`/api/posts/${id}`, { content, mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined });
    return normalizePost(res.data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/posts/${id}`);
  },

  async remove(id: string): Promise<void> {
    return this.delete(id);
  },

  async like(postId: string): Promise<{ likesCount: number; isLiked: boolean }> {
    await apiClient.post(`/api/posts/${postId}/like`);
    const res = await apiClient.get<{ data: BackendPost }>(`/api/posts/${postId}`);
    return {
      likesCount: res.data?._count?.likes ?? 0,
      isLiked: true,
    };
  },

  async unlike(postId: string): Promise<{ likesCount: number; isLiked: boolean }> {
    await apiClient.delete(`/api/posts/${postId}/like`);
    const res = await apiClient.get<{ data: BackendPost }>(`/api/posts/${postId}`);
    return {
      likesCount: res.data?._count?.likes ?? 0,
      isLiked: false,
    };
  },
};
