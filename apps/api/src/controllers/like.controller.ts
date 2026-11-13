import type { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { createAndEmitNotification } from "../lib/socket.js";
export async function likePost(req: Request, res: Response) {
  try {
    const user = res.locals.session.user;
    const postId = req.params.postId as string;

    if (!postId) {
      return res.status(400).json({
        status: "error",
        message: "Post id is required",
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId,
        },
      },
    });

    if (existingLike) {
      return res.status(409).json({
        status: "error",
        message: "Post already liked",
      });
    }

    const like = await prisma.like.create({
      data: {
        userId: user.id,
        postId,
      },
    });

    if (user.id !== post.authorId) {
      const actorName = user.name || user.username || "Someone";
      await createAndEmitNotification({
        type: "like",
        message: `${actorName} liked your post`,
        actorId: user.id,
        userId: post.authorId,
        postId,
      });
    }

    return res.status(201).json({
      status: "success",
      data: like,
    });
  } catch (error) {
    console.error("LIKE POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to like post",
    });
  }
}

export async function unlikePost(req: Request, res: Response) {
  try {
    const user = res.locals.session.user;
    const postId = req.params.postId as string;

    if (!postId) {
      return res.status(400).json({
        status: "error",
        message: "Post id is required",
      });
    }

    const like = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId,
        },
      },
    });

    if (!like) {
      return res.status(404).json({
        status: "error",
        message: "Post is not liked",
      });
    }

    await prisma.like.delete({
      where: {
        id: like.id,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("UNLIKE POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to unlike post",
    });
  }
}

export async function getPostLikes(req: Request, res: Response) {
  try {
    const postId = req.params.postId as string;

    if (!postId) {
      return res.status(400).json({
        status: "error",
        message: "Post id is required",
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
      },
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const likes = await prisma.like.findMany({
      where: {
        postId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return res.json({
      status: "success",
      data: likes,
      count: likes.length,
    });
  } catch (error) {
    console.error("GET LIKES ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to fetch likes",
    });
  }
}