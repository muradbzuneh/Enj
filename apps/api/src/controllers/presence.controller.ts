import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getOnlineUserIds, isOnline } from "../lib/socket.js";

/**
 * Presence for the people the viewer cares about.
 *
 * Returns which of the given users are currently online plus their last seen
 * timestamp, so the UI can show "online now" or "last seen 5m ago".
 */
export async function getPresence(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session?.user;

    const related = currentUser
      ? await prisma.follow.findMany({
          where: {
            OR: [{ followerId: currentUser.id }, { followingId: currentUser.id }],
          },
          select: { followerId: true, followingId: true },
        })
      : [];

    const ids = new Set<string>();
    related.forEach((r) => {
      ids.add(r.followerId);
      ids.add(r.followingId);
    });
    if (currentUser) ids.delete(currentUser.id);

    const online = new Set(getOnlineUserIds());

    const users = ids.size
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(ids) } },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            lastSeenAt: true,
          },
        })
      : [];

    return res.json({
      status: "success",
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        image: u.image,
        online: online.has(u.id) || isOnline(u.id),
        lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("GET PRESENCE ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to fetch presence" });
  }
}
