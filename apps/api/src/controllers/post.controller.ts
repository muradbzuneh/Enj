import type { Request, Response } from "express";

import { prisma } from "../lib/prisma.js";
import { attachFollowState } from "../lib/follow-state.js";
import { emitNewPostToFollowers } from "../lib/socket.js";
import { extractAndSaveHashtags, removeHashtags } from "../lib/hashtags.js";
import {
  feedQuerySchema,
  postIdSchema,
} from "../schemas/post.schema.js";

export async function createPost(req: Request, res: Response) {
  try {
    const user = res.locals.session.user;

    const content = req.body.content || "";
    const mediaUrl = req.body.mediaUrl || null;

    const post = await prisma.post.create({
      data: {
        content,
        mediaUrl,
        authorId: user.id,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
          },
        },

        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (content) {
      await extractAndSaveHashtags(post.id, content);
    }

    // Live feed update: the followers of the author get a "new post" event
    // so their feed can show a banner instead of silently changing.
    await emitNewPostToFollowers({
      id: post.id,
      content: post.content,
      mediaUrl: post.mediaUrl,
      authorId: post.authorId,
      createdAt: post.createdAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        username: post.author.username,
        image: post.author.image,
      },
    });

    return res.status(201).json({
      status: "success",
      data: post,
    });
  } catch (error) {
    console.error("CREATE POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create post",
    });
  }
}

export async function getPosts(req: Request, res: Response) {
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

    const { page, limit, author } = parsed.data;

    const skip = (page - 1) * limit;

    // Resolve the author filter (id or username) into a user id.
    let authorId: string | undefined;
    if (author) {
      const target = await prisma.user.findFirst({
        where: {
          OR: [{ id: author }, { username: author.toLowerCase() }],
        },
        select: { id: true },
      });
      authorId = target?.id;
    }

    const where = authorId ? { authorId } : {};

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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

          likes: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : false,
          bookmarks: currentUser
            ? { where: { userId: currentUser.id }, select: { id: true } }
            : false,

          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),

      prisma.post.count({
        where,
      }),
    ]);

    const data = await attachFollowState(
      posts.map((p) => ({
        ...p,
        isLiked: currentUser ? (p as any).likes?.length > 0 : false,
        isBookmarked: currentUser ? (p as any).bookmarks?.length > 0 : false,
        likes: undefined,
        bookmarks: undefined,
      })),
      currentUser?.id,
    );

    const totalPages = Math.ceil(total / limit);

    return res.json({
      status: "success",

      data,

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
    console.error("GET POSTS ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to fetch posts",
    });
  }
}

export async function getPostById(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session?.user;
    const parsed = postIdSchema.safeParse(req.params);

    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Invalid post id",
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: parsed.data.id,
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

        comments: {
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
        },

        likes: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,
        bookmarks: currentUser
          ? { where: { userId: currentUser.id }, select: { id: true } }
          : false,

        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({
        status: "error",
        message: "Post not found",
      });
    }

    const isLiked = currentUser ? (post as any).likes?.length > 0 : false;
    const isBookmarked = currentUser ? (post as any).bookmarks?.length > 0 : false;

    return res.json({
      status: "success",
      data: { ...post, likes: undefined, bookmarks: undefined, isLiked, isBookmarked },
    });
  } catch (error) {
    console.error("GET POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to fetch post",
    });
  }
}

export async function updatePost(req: Request, res: Response) {
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
        id: parsed.data.id,
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

    if (post.authorId !== user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to update this post",
      });
    }

    const updatedPost = await prisma.post.update({
      where: {
        id: post.id,
      },

      data: {
        content: req.body.content !== undefined ? req.body.content : undefined,
        mediaUrl: req.body.mediaUrl !== undefined ? req.body.mediaUrl : undefined,
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

        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    await removeHashtags(post.id);
    if (updatedPost.content) {
      await extractAndSaveHashtags(post.id, updatedPost.content);
    }

    return res.json({
      status: "success",
      data: updatedPost,
    });
  } catch (error) {
    console.error("UPDATE POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to update post",
    });
  }
}

export async function deletePost(req: Request, res: Response) {
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
        id: parsed.data.id,
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

    if (post.authorId !== user.id) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to delete this post",
      });
    }

    await removeHashtags(post.id);
    await prisma.post.delete({
      where: {
        id: post.id,
      },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("DELETE POST ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to delete post",
    });
  }
}