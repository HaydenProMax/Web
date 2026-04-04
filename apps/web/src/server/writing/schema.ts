import { z } from "zod";

const localMediaUrlSchema = z.string().startsWith("/api/media/files/");
const publicUrlSchema = z.string().url();
const imageSourceSchema = publicUrlSchema.or(localMediaUrlSchema);
const optionalCoverImageUrlSchema = z.union([publicUrlSchema, localMediaUrlSchema, z.literal("")]).optional();

export const richTextNodeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    content: z.string().min(1)
  }),
  z.object({
    type: z.literal("heading"),
    content: z.string().min(1),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)])
  }),
  z.object({
    type: z.literal("image"),
    src: imageSourceSchema,
    alt: z.string().optional(),
    caption: z.string().optional()
  }),
  z.object({
    type: z.literal("videoEmbed"),
    embedUrl: z.string().url(),
    provider: z.enum(["youtube", "bilibili", "vimeo", "custom"]).optional(),
    caption: z.string().optional()
  }),
  z.object({
    type: z.literal("quote"),
    content: z.string().min(1)
  })
]);

export const writingDraftInputSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().default(""),
  coverImageUrl: optionalCoverImageUrlSchema,
  sourceNoteSlug: z.string().max(120).optional().default(""),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).default("PRIVATE"),
  content: z.array(richTextNodeSchema).min(1)
});

export type WritingDraftInput = z.infer<typeof writingDraftInputSchema>;
