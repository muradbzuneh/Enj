import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function getConversations(req: Request, res: Response) {  try {
    const currentUser = res.locals.session.user;

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { createdAt: "desc" } },
    });

    const conversations = await Promise.all(
      participations.map(async (p) => {
        const other = p.conversation.participants.find(
          (part) => part.userId !== currentUser.id
        );
        const lastMessage = p.conversation.messages[0] || null;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: p.conversationId,
            read: false,
            authorId: { not: currentUser.id },
          },
        });

        return {
          id: p.conversationId,
          otherUser: other?.user || null,
          lastMessage: lastMessage
            ? { content: lastMessage.content, createdAt: lastMessage.createdAt.toISOString(), authorName: lastMessage.author.name }
            : null,
          unreadCount,
          createdAt: p.conversation.createdAt.toISOString(),
        };
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.createdAt;
      const bTime = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return res.json({ status: "success", data: conversations });
  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to fetch conversations" });
  }
}

/**
 * A single conversation.
 *
 * Needed when a conversation was just created (Message button on a profile):
 * it is not part of the cached conversation list yet, and without this the
 * chat panel would stay empty until the next poll.
 */
export async function getConversation(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const conversationId = req.params.id as string;

    const participation = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: currentUser.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, username: true, image: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { author: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!participation) {
      return res.status(404).json({ status: "error", message: "Conversation not found" });
    }

    const other = participation.conversation.participants.find(
      (part) => part.userId !== currentUser.id,
    );
    const lastMessage = participation.conversation.messages[0] || null;

    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        read: false,
        authorId: { not: currentUser.id },
      },
    });

    return res.json({
      status: "success",
      data: {
        id: conversationId,
        otherUser: other?.user || null,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt.toISOString(),
              authorName: lastMessage.author.name,
            }
          : null,
        unreadCount,
        createdAt: participation.conversation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("GET CONVERSATION ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to fetch conversation" });
  }
}

export async function createConversation(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ status: "error", message: "participantId is required" });
    }

    if (participantId === currentUser.id) {
      return res.status(400).json({ status: "error", message: "Cannot start conversation with yourself" });
    }

    const existingParticipant = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true },
    });
    if (!existingParticipant) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const myParticipations = await prisma.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      select: { conversationId: true },
    });
    const myConvIds = myParticipations.map((p) => p.conversationId);

    const existing = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: { in: myConvIds },
        userId: participantId,
      },
      select: { conversationId: true },
    });

    if (existing) {
      return res.json({ status: "success", data: { id: existing.conversationId } });
    }

    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: currentUser.id },
            { userId: participantId },
          ],
        },
      },
    });

    return res.status(201).json({ status: "success", data: { id: conversation.id } });
  } catch (error) {
    console.error("CREATE CONVERSATION ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to create conversation" });
  }
}

export async function getMessages(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const conversationId = req.params.id as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const skip = (page - 1) * limit;

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: currentUser.id } },
    });
    if (!participant) {
      return res.status(403).json({ status: "error", message: "Not a participant" });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { author: { select: { id: true, name: true, username: true, image: true } } },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    await prisma.message.updateMany({
      where: { conversationId, authorId: { not: currentUser.id }, read: false },
      data: { read: true },
    });

    return res.json({
      status: "success",
      data: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to fetch messages" });
  }
}

export async function sendMessage(req: Request, res: Response) {
  try {
    const currentUser = res.locals.session.user;
    const conversationId = req.params.id as string;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ status: "error", message: "Content is required" });
    }

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: currentUser.id } },
    });
    if (!participant) {
      return res.status(403).json({ status: "error", message: "Not a participant" });
    }

    const message = await prisma.message.create({
      data: { content: content.trim(), conversationId, authorId: currentUser.id },
      include: { author: { select: { id: true, name: true, username: true, image: true } } },
    });

    return res.status(201).json({
      status: "success",
      data: { ...message, createdAt: message.createdAt.toISOString() },
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    return res.status(500).json({ status: "error", message: "Unable to send message" });
  }
}
