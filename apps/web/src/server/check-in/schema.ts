import { z } from "zod";

export const checkInScheduleTypeSchema = z.enum(["DAILY", "WEEKDAYS", "CUSTOM"]);
export const checkInSkipReasonTagSchema = z.enum(["SICK", "BUSY", "OUT", "REST", "FORGOT", "OTHER"]);

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

export const checkInHabitEditableFieldsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().default("")
});

export type CheckInHabitInput = z.infer<typeof checkInHabitInputSchema>;
export type CheckInSkipInput = z.infer<typeof checkInSkipInputSchema>;
export type CheckInHabitEditableFieldsInput = z.infer<typeof checkInHabitEditableFieldsSchema>;
