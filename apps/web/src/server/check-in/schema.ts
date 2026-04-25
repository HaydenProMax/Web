import { z } from "zod";

export const checkInScheduleTypeSchema = z.enum(["DAILY", "WEEKDAYS", "CUSTOM"]);
export const checkInSkipReasonTagSchema = z.enum(["SICK", "BUSY", "OUT", "REST", "FORGOT", "OTHER"]);
export const checkInDateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use date format YYYY-MM-DD.");

export const checkInHabitInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().default(""),
  scheduleType: checkInScheduleTypeSchema.default("DAILY"),
  scheduleDays: z.array(z.number().int().min(0).max(6)).max(7).optional().default([])
}).superRefine((value, ctx) => {
  if (value.scheduleType === "CUSTOM" && value.scheduleDays.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom schedule requires at least one weekday.",
      path: ["scheduleDays"]
    });
  }
});

export const checkInSkipInputSchema = z.object({
  reasonTag: checkInSkipReasonTagSchema,
  note: z.string().trim().max(280).optional().default("")
});

export const checkInTodayUpdateItemSchema = z.object({
  habitId: z.string().trim().min(1),
  status: z.enum(["DONE", "SKIPPED"]),
  reasonTag: checkInSkipReasonTagSchema.optional(),
  note: z.string().trim().max(280).optional().default("")
}).superRefine((value, ctx) => {
  if (value.status === "SKIPPED" && !value.reasonTag) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Skipped check-ins require a reasonTag.",
      path: ["reasonTag"]
    });
  }
});

export const checkInTodayUpdateInputSchema = z.object({
  updates: z.array(checkInTodayUpdateItemSchema).min(1).max(50)
});

export const checkInTodayUpdateEnvelopeSchema = z.object({
  updates: z.array(z.unknown()).min(1).max(50)
});

export const checkInDateUpdateInputSchema = z.object({
  date: checkInDateKeySchema,
  updates: z.array(z.unknown()).min(1).max(50)
});

export const checkInEntryResetItemSchema = z.object({
  habitId: z.string().trim().min(1)
});

export const checkInEntryResetInputSchema = z.object({
  date: checkInDateKeySchema,
  resets: z.array(checkInEntryResetItemSchema).min(1).max(50)
});

export const checkInHabitEditableFieldsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().default(""),
  scheduleType: checkInScheduleTypeSchema.optional(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).max(7).optional()
}).superRefine((value, ctx) => {
  if (value.scheduleType === "CUSTOM" && (!value.scheduleDays || value.scheduleDays.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom schedule requires at least one weekday.",
      path: ["scheduleDays"]
    });
  }
});

export type CheckInHabitInput = z.infer<typeof checkInHabitInputSchema>;
export type CheckInSkipInput = z.infer<typeof checkInSkipInputSchema>;
export type CheckInTodayUpdateInput = z.infer<typeof checkInTodayUpdateInputSchema>;
export type CheckInTodayUpdateItemInput = z.infer<typeof checkInTodayUpdateItemSchema>;
export type CheckInDateUpdateInput = z.infer<typeof checkInDateUpdateInputSchema>;
export type CheckInEntryResetInput = z.infer<typeof checkInEntryResetInputSchema>;
export type CheckInHabitEditableFieldsInput = z.infer<typeof checkInHabitEditableFieldsSchema>;
