import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { createAndEmitNotification } from "../lib/socket.js";

export async function followUser(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const userId = req.params.userId as string;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User id is required",
      });
    }

    if (userId === currentUser.id) {
      return res.status(400).json({
        status: "error",
        message: "You cannot follow yourself",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      return res.status(409).json({
        status: "error",
        message: "You already follow this user",
      });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: currentUser.id,
        followingId: userId,
      },
    });

    if (currentUser.id !== userId) {
      const actorName = currentUser.name || currentUser.username || "Someone";
      await createAndEmitNotification({
        type: "follow",
        message: `${actorName} started following you`,
        actorId: currentUser.id,
        userId,
      });
    }

    return res.status(201).json({
      status: "success",
      data: follow,
    });
  } catch (error) {
    console.error("FOLLOW USER ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to follow user",
    });
  }
}

export async function unfollowUser(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const userId = req.params.userId as string;

    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "User id is required",
      });
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: userId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({
        status: "error",
        message: "You do not follow this user",
      });
    }

    await prisma.follow.delete({
      where: {
        id: follow.id,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("UNFOLLOW USER ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to unfollow user",
    });
  }
}
