import { z } from "zod";

import { richTextNodeSchema } from "@/server/writing/schema";

export const knowledgeNoteInputSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().default(""),
  domainName: z.string().max(80).optional().default(""),
  tags: z.array(z.string().min(1).max(40)).max(12).optional().default([]),
  content: z.array(richTextNodeSchema).min(1)
});

export type KnowledgeNoteInput = z.infer<typeof knowledgeNoteInputSchema>;
