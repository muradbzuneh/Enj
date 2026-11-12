import { Router } from "express";
import { getPopularHashtags } from "../controllers/explore.controller.js";
import { optionalAuth } from "../middleware/optional-auth.js";

export const exploreRouter = Router();

exploreRouter.get("/explore/hashtags", optionalAuth, getPopularHashtags);
