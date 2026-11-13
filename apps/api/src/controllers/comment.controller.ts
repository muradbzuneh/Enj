import type { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { createAndEmitNotification } from "../lib/socket.js";
import {
  commentIdSchema,
  commentQuerySchema,
  postIdSchema,
} from "../schemas/comment.schema.js";

export async function createComment(req: Request, res: Response) {
  try {
    const user = res.locals.session.user;

    const parsed = postIdSchema.safeParse(req.params);

    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid post id",
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: parsed.data.postId,
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

    const comment = await prisma.comment.create({
      data: {
        content: req.body.content,
        postId: post.id,
        authorId: user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    if (user.id !== post.authorId) {
      const actorName = user.name || user.username || "Someone";
      await createAndEmitNotification({
        type: "comment",
        message: `${actorName} commented on your post`,
        actorId: user.id,
        userId: post.authorId,
        postId: post.id,
      });
    }

    return res.status(201).json({
      status: "success",
      data: comment,
    });
  } catch (error) {
    console.error("CREATE COMMENT ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create comment",
    });
  }
}

export async function getComments(req: Request, res: Response) {
  try {
    const postParsed = postIdSchema.safeParse(req.params);

    if (!postParsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid post id",
      });
    }

    const queryParsed = commentQuerySchema.safeParse(req.query);

    if (!queryParsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid pagination parameters",
      });
    }

    const { page, limit } = queryParsed.data;

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          postId: postParsed.data.postId,
        },

        skip,
        take: limit,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      }),

      prisma.comment.count({
        where: {
          postId: postParsed.data.postId,
        },
      }),
    ]);

    return res.json({
      status: "success",
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to fetch comments",
    });
  }
}

export async function deleteComment(req: Request, res: Response) {
  try {
    const user = res.locals.session.user;

    const parsed = commentIdSchema.safeParse(req.params);

    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid comment id",
      });
    }

    const comment = await prisma.comment.findUnique({
      where: {
        id: parsed.data.id,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!comment) {
      return res.status(404).json({
        status: "error",
        message: "Comment not found",
      });
    }

    if (comment.authorId !== user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to delete this comment",
      });
    }

    await prisma.comment.delete({
      where: {
        id: comment.id,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete comment",
    });
  }
}
