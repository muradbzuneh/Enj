import { apiClient } from "@/lib/api/client";

interface ConversationUser {
  id: string;
  name: string;
  username: string | null;
  image?: string | null;
}

interface ConversationItem {
  id: string;
  otherUser: ConversationUser | null;
  lastMessage: { content: string; createdAt: string; authorName: string } | null;
  unreadCount: number;
  createdAt: string;
}

interface MessageItem {
  id: string;
  content: string;
  authorId: string;
  author: ConversationUser;
  read: boolean;
  createdAt: string;
}

export const messagesService = {
  async getConversations(): Promise<ConversationItem[]> {
    const res = await apiClient.get<{ data: ConversationItem[] }>("/api/conversations");
    return res.data || [];
  },

  async getConversation(conversationId: string): Promise<ConversationItem | null> {
    try {
      const res = await apiClient.get<{ data: ConversationItem }>(
        `/api/conversations/${conversationId}`,
      );
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  async createConversation(participantId: string): Promise<{ id: string }> {
    const res = await apiClient.post<{ data: { id: string } }>("/api/conversations", { participantId });
    return res.data;
  },

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<{ items: MessageItem[]; total: number }> {
    const res = await apiClient.get<{ data: MessageItem[]; pagination: { total: number } }>(
      `/api/conversations/${conversationId}/messages`,
      { page, limit },
    );
    return { items: res.data || [], total: res.pagination?.total ?? 0 };
  },

  async sendMessage(conversationId: string, content: string): Promise<MessageItem> {
    const res = await apiClient.post<{ data: MessageItem }>(`/api/conversations/${conversationId}/messages`, { content });
    return res.data;
  },
};
