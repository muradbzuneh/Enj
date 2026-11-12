import { apiClient } from "@/lib/api/client";
import type { User } from "@/types";

interface MeResponse {
  status: string;
  user: User;
  session?: { id: string; expiresAt: string };
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    try {
      const res = await apiClient.get<MeResponse>("/api/me");
      return res.user ?? null;
    } catch (err: any) {
      if (err?.status === 401) return null;
      throw err;
    }
  },

  async signIn(email: string, password: string): Promise<User> {
    const res = await apiClient.post<{ user: User }>("/api/auth/sign-in/email", {
      email,
      password,
    });
    return res.user;
  },

  async signUp(
    email: string,
    password: string,
    name: string,
    username?: string,
  ): Promise<User> {
    const res = await apiClient.post<{ user: User }>("/api/auth/sign-up/email", {
      email,
      password,
      name,
      ...(username ? { username } : {}),
    });
    return res.user;
  },

  async signOut(): Promise<void> {
    await apiClient.post("/api/auth/sign-out");
  },

  async me(): Promise<User | null> {
    return this.getCurrentUser();
  },

  getDirectoryUsers(): User[] {
    return [];
  },

  async switchPersona(_userId: string): Promise<User> {
    throw new Error("Switch persona is not available in live mode.");
  },
};
