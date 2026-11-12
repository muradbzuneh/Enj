import { Router } from "express";
import {
  getConversations,
  getConversation,
  createConversation,
  getMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

export const messageRouter = Router();

messageRouter.get("/conversations", requireAuth, getConversations);
messageRouter.get("/conversations/:id", requireAuth, getConversation);
messageRouter.post("/conversations", requireAuth, createConversation);
messageRouter.get("/conversations/:id/messages", requireAuth, getMessages);
messageRouter.post("/conversations/:id/messages", requireAuth, sendMessage);
