import { prisma } from "./prisma.js";

/**
 * Adds `isFollowingAuthor` to a list of posts in a single query.
 *
 * Social feeds need to know whether the viewer already follows the author so
 * they can render a "Follow" affordance next to the name - exactly like a
 * real social platform. Doing it per post would be N+1, so the follow edges
 * are fetched once for all authors in the page.
 */
export async function attachFollowState<
  T extends { authorId: string },
>(posts: T[], currentUserId?: string): Promise<(T & { isFollowingAuthor: boolean })[]> {
  if (!currentUserId || posts.length === 0) {
    return posts.map((post) => ({ ...post, isFollowingAuthor: false }));
  }

  const authorIds = Array.from(new Set(posts.map((post) => post.authorId)));

  const follows = await prisma.follow.findMany({
    where: {
      followerId: currentUserId,
      followingId: { in: authorIds },
    },
    select: { followingId: true },
  });

  const followed = new Set(follows.map((follow) => follow.followingId));

  return posts.map((post) => ({
    ...post,
    isFollowingAuthor: followed.has(post.authorId),
  }));
}
