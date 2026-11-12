import { z } from "zod";

export const createPostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(2000, "Post cannot exceed 2000 characters")
      .optional()
      .default(""),
    mediaUrl: z.string().nullable().optional().default(null),
  })
  .refine((data) => data.content.trim().length > 0 || data.mediaUrl, {
    message: "Post must have text content or an attached media",
  });

export const updatePostSchema = z.object({
  content: z
    .string()
    .trim()
    .max(2000, "Post cannot exceed 2000 characters")
    .optional(),
  mediaUrl: z.string().nullable().optional(),
});

export const postIdSchema = z.object({
  id: z.string().min(1, "Post id is required"),
});

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  /**
   * "all"      -> every post on the platform ("For You")
   * "following"-> only posts by the people the user follows (plus their own)
   */
  filter: z.enum(["all", "following"]).default("all"),
  /**
   * "all"  -> posts with and without media
   * "only" -> only posts that have an image or video attached (used by Reels)
   */
  media: z.enum(["all", "only"]).default("all"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
