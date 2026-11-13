import { Router } from "express";
import { getPresence } from "../controllers/presence.controller.js";
import { optionalAuth } from "../middleware/optional-auth.js";

export const presenceRouter = Router();

presenceRouter.get("/presence", optionalAuth, getPresence);
