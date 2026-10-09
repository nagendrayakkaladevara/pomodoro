import { z } from "zod";
export const accentSchema = z.enum(["tomato", "sage", "blue", "amber"]);
export const billingSchema = z.enum(["monthly", "annual"]);
export type Billing = z.infer<typeof billingSchema>;
export const soundSchema = z.enum([
  "off",
  "rain",
  "brown",
  "ocean",
  "piano",
  "music-box",
  "drift",
]);
const id = z.string().uuid();
export const projectInput = z
  .object({
    name: z.string().trim().min(1, "Give your project a name.").max(80),
    description: z.string().trim().max(500),
    color: accentSchema,
    weeklyGoalMinutes: z.number().int().min(30).max(6000),
    archived: z.boolean(),
  })
  .strict();
export const projectSchema = projectInput.extend({ id });
export type Project = z.infer<typeof projectSchema>;
export const taskInput = z
  .object({
    title: z.string().trim().min(1, "Add a task title.").max(160),
    projectId: id.nullable(),
    estimate: z.number().int().min(1).max(12),
    plannedDate: z.string().date(),
    tags: z.array(z.string().trim().min(1).max(24)).max(5),
    recurrence: z.enum(["none", "daily", "weekdays"]),
    done: z.boolean(),
  })
  .strict();
export const taskSchema = taskInput.extend({
  id,
  templateId: id.nullable().default(null),
});
export type ProTask = z.infer<typeof taskSchema>;
export const routineInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    focus: z.number().int().min(1).max(120),
    short: z.number().int().min(1).max(30),
    long: z.number().int().min(1).max(60),
    interval: z.number().int().min(2).max(8),
    ambient: soundSchema,
    taskTitles: z.array(z.string().trim().min(1).max(160)).max(12),
  })
  .strict();
export const routineSchema = routineInput.extend({ id });
export type Routine = z.infer<typeof routineSchema>;
export const mixInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    layers: z
      .array(
        z.object({
          sound: soundSchema.exclude(["off"]),
          volume: z.number().min(0).max(1),
        }),
      )
      .min(1)
      .max(3),
  })
  .strict()
  .refine(
    (m) => new Set(m.layers.map((l) => l.sound)).size === m.layers.length,
    "Choose different sounds.",
  )
  .refine(
    (m) => m.layers.some((l) => l.volume > 0),
    "Turn up at least one sound.",
  );
export const mixSchema = mixInput.safeExtend({ id });
export type Mix = z.infer<typeof mixSchema>;
export const preferencesSchema = z.object({
  weeklyGoalMinutes: z.number().int().min(30).max(6000),
  accent: accentSchema,
});
export const sampleSessionSchema = z.object({
  id,
  projectId: id.nullable(),
  taskTitle: z.string().max(160),
  completedAt: z.number(),
  durationMinutes: z.number().int().min(1).max(120),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectSchema).max(200),
  tasks: z.array(taskSchema).max(500),
  routines: z.array(routineSchema).max(100),
  mixes: z.array(mixSchema).max(50),
  preferences: preferencesSchema,
  sampleSessions: z.array(sampleSessionSchema).max(1000),
  skippedOccurrences: z
    .array(z.object({ templateId: id, date: z.string().date() }))
    .max(500)
    .default([]),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  billing: billingSchema,
  activated: z.boolean(),
  cancelled: z.boolean().default(false),
});
export type Profile = z.infer<typeof profileSchema>;
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(15, "Use at least 15 characters for this preview.")
    .max(128),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your name.").max(80),
});
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(date: string, offset: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return localDate(d);
}
export const accents = {
  tomato: "Tomato",
  sage: "Sage",
  blue: "Slate blue",
  amber: "Warm amber",
} as const;
