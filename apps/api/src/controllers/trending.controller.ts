import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { attachFollowState } from "../lib/follow-state.js";
import { feedQuerySchema } from "../schemas/post.schema.js";

/**
 * Trending posts ranking algorithm:
 *
 * Score = (likes * 3) + (comments * 2) + freshness_bonus
 *
 * The freshness bonus decays exponentially over 7 days:
 *   freshness = 10 * e^(-days_old / 7)
 *
 * This balances engagement (likes weighted higher than comments)
 * with recency — a fresh post with moderate engagement can
 * outrank an old post with many likes.
 *
 * The calculation is done in PostgreSQL using raw SQL for efficiency,
 * avoiding loading the entire post table into Node.js memory.
 */
export async function getTrendingPosts(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session?.user;
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid pagination parameters",
        errors: parsed.error.flatten(),
      });
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Use $queryRaw tagged template for automatic parameterization (no SQL injection)
    const [posts, countResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          p.id,
          p.content,
          p."createdAt",
          p."updatedAt",
          p."authorId",
          (
            (COALESCE(lc.like_count, 0) * 3.0)
            + (COALESCE(cc.comment_count, 0) * 2.0)
            + (10.0 * EXP(-EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / (7.0 * 86400.0)))
          ) AS score
        FROM "post" p
        LEFT JOIN (
          SELECT "postId", COUNT(*)::int AS like_count
          FROM "like"
          GROUP BY "postId"
        ) lc ON lc."postId" = p.id
        LEFT JOIN (
          SELECT "postId", COUNT(*)::int AS comment_count
          FROM "comment"
          GROUP BY "postId"
        ) cc ON cc."postId" = p.id
        ORDER BY score DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as Promise<
        Array<{
          id: string;
          content: string;
          createdAt: Date;
          updatedAt: Date;
          authorId: string;
          score: number;
        }>
      >,
      prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM "post"` as Promise<
        Array<{ total: number }>
      >,
    ]);

    const total = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    if (posts.length === 0) {
      return res.json({
        status: "success",
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: false,
          hasPreviousPage: page > 1,
        },
      });
    }

    // Fetch full post data with relations for the trending post IDs
    const postIds = posts.map((p) => p.id);

    const fullPosts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        likes: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
        bookmarks: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    const data = await attachFollowState(
      fullPosts.map((p) => ({
        ...p,
        isLiked: currentUser ? (p as any).likes?.length > 0 : false,
        isBookmarked: currentUser ? (p as any).bookmarks?.length > 0 : false,
        likes: undefined,
        bookmarks: undefined,
      })),
      currentUser?.id,
    );

    // Preserve the score-based ordering from the raw query
    const postOrder = new Map(posts.map((p, i) => [p.id, i]));
    const orderedPosts = data.sort(
      (a, b) => (postOrder.get(a.id) ?? 0) - (postOrder.get(b.id) ?? 0),
    );

    return res.json({
      status: "success",
      data: orderedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("GET TRENDING POSTS ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: "Unable to fetch trending posts",
    });
  }
}
