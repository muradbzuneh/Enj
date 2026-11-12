import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getPopularHashtags(req: Request, res: Response) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

    const posts = await prisma.post.findMany({
      select: { content: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const hashtagMap = new Map<string, number>();
    for (const post of posts) {
      const matches = post.content.match(/#[\w\u0590-\u05FF]+/g);
      if (matches) {
        for (const tag of matches) {
          const lower = tag.toLowerCase();
          hashtagMap.set(lower, (hashtagMap.get(lower) || 0) + 1);
        }
      }
    }

    const sorted = Array.from(hashtagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    return res.json({ status: "success", data: sorted });
  } catch (error) {
    console.error("GET POPULAR HASHTAGS ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to fetch hashtags" });
  }
}
