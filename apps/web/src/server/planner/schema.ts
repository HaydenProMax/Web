import { z } from "zod";

export const plannerTaskEditableStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export const plannerTaskInputSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: plannerTaskEditableStatusSchema.default("TODO"),
  scheduledFor: z.string().datetime().or(z.literal("")).optional().default(""),
  dueAt: z.string().datetime().or(z.literal("")).optional().default(""),
  relatedNoteSlug: z.string().max(120).optional().default(""),
  relatedDraftId: z.string().max(120).optional().default("")
});

export type PlannerTaskInput = z.infer<typeof plannerTaskInputSchema>;
export type PlannerTaskEditableStatus = z.infer<typeof plannerTaskEditableStatusSchema>;

