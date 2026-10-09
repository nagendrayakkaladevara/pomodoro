import { z } from "zod";
import { durationLimits } from "./dial";

export const modeSchema = z.enum(["focus", "short", "long"]);
export type Mode = z.infer<typeof modeSchema>;
export const modeNames: Record<Mode, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};
export const settingsSchema = z.object({
  focus: z.number().int().min(1).max(120),
  short: z.number().int().min(1).max(30),
  long: z.number().int().min(1).max(60),
  interval: z.number().int().min(2).max(8),
  goal: z.number().int().min(1).max(16),
  autoBreak: z.boolean(),
  sound: z.boolean(),
  volume: z.number().min(0).max(1),
  ambient: z.enum([
    "off",
    "rain",
    "brown",
    "ocean",
    "piano",
    "music-box",
    "drift",
  ]),
  theme: z.enum(["light", "dark"]),
  mix: z
    .object({
      name: z.string().max(80),
      layers: z
        .array(
          z.object({
            sound: z.enum([
              "rain",
              "brown",
              "ocean",
              "piano",
              "music-box",
              "drift",
            ]),
            volume: z.number().min(0).max(1),
          }),
        )
        .min(1)
        .max(3),
    })
    .nullable()
    .optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  projectId: z.string().nullable().optional(),
  estimate: z.number().int().min(1).max(12),
  earned: z.number().int().nonnegative(),
  done: z.boolean(),
});
export type Task = z.infer<typeof taskSchema>;
const timerSchema = z.object({
  mode: modeSchema,
  remaining: z.number().min(0).max(7200000),
  total: z.number().positive().max(7200000),
  endAt: z.number().nullable(),
  sessionId: z.string(),
  taskId: z.string().nullable(),
  taskTitle: z.string(),
  projectId: z.string().nullable().optional(),
});
const sessionSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  completedAt: z.number(),
  duration: z.number().positive(),
  task: z.string(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  tasks: z.array(taskSchema).max(200),
  selectedTask: z.string().nullable(),
  timer: timerSchema,
  sessions: z.array(sessionSchema).max(5000),
  cycle: z.number().int().nonnegative(),
  note: z.string().max(2000),
});
export type State = z.infer<typeof stateSchema>;
export const STORAGE_KEY = "little-focus:v1";
export const defaultSettings: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  interval: 4,
  goal: 4,
  autoBreak: false,
  sound: false,
  volume: 0.35,
  ambient: "off",
  theme: "light",
};
export function freshTimer(mode: Mode, settings: Settings): State["timer"] {
  const total = settings[mode] * 60000;
  return {
    mode,
    total,
    remaining: total,
    endAt: null,
    sessionId: "",
    taskId: null,
    taskTitle: "",
  };
}
export function initialState(): State {
  return {
    version: 1,
    settings: { ...defaultSettings },
    tasks: [],
    selectedTask: null,
    timer: freshTimer("focus", defaultSettings),
    sessions: [],
    cycle: 0,
    note: "",
  };
}
export function parseState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      parsed.data.timer.remaining > parsed.data.timer.total
    )
      return null;
    return parsed.data;
  } catch {
    return null;
  }
}
export function remainingTime(timer: State["timer"], now: number): number {
  return timer.endAt === null
    ? timer.remaining
    : Math.max(0, timer.endAt - now);
}
export function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
export type Action =
  | { type: "toggle"; now: number; id: string }
  | { type: "tick"; now: number; visible: boolean }
  | { type: "reset" }
  | { type: "set-duration"; minutes: number }
  | { type: "mode"; mode: Mode }
  | { type: "skip" }
  | { type: "settings"; settings: Settings }
  | { type: "select"; id: string | null }
  | { type: "add-task"; task: Task }
  | { type: "upsert-task"; task: Task }
  | { type: "toggle-task"; id: string }
  | { type: "delete-task"; id: string }
  | { type: "note"; note: string }
  | { type: "restore"; state: State };

export function reducer(state: State, action: Action): State {
  const timer = state.timer;
  switch (action.type) {
    case "restore":
      return action.state;
    case "toggle": {
      if (timer.endAt !== null) {
        if (timer.endAt <= action.now)
          return reducer(state, {
            type: "tick",
            now: action.now,
            visible: false,
          });
        return {
          ...state,
          timer: {
            ...timer,
            remaining: remainingTime(timer, action.now),
            endAt: null,
          },
        };
      }
      const task = state.tasks.find(
        (t) => t.id === state.selectedTask && !t.done,
      );
      return {
        ...state,
        timer: {
          ...timer,
          endAt: action.now + timer.remaining,
          sessionId: timer.sessionId || action.id,
          taskId: timer.sessionId ? timer.taskId : (task?.id ?? null),
          projectId: timer.sessionId
            ? timer.projectId
            : (task?.projectId ?? null),
          taskTitle: timer.sessionId
            ? timer.taskTitle
            : (task?.title ?? "Open focus"),
        },
      };
    }
    case "tick": {
      if (timer.endAt === null || timer.endAt > action.now) return state;
      const isFocus = timer.mode === "focus";
      const cycle = state.cycle + (isFocus ? 1 : 0);
      const nextMode = isFocus
        ? cycle % state.settings.interval === 0
          ? "long"
          : "short"
        : "focus";
      const next = freshTimer(nextMode, state.settings);
      // Never backfill imaginary sessions after a tab has been suspended.
      if (
        isFocus &&
        state.settings.autoBreak &&
        action.visible &&
        action.now - timer.endAt < 5000
      ) {
        next.endAt = action.now + next.total;
        next.sessionId = `break-${timer.sessionId}`;
      }
      const alreadySaved = state.sessions.some((s) => s.id === timer.sessionId);
      return {
        ...state,
        cycle,
        timer: next,
        sessions:
          isFocus && !alreadySaved
            ? [
                ...state.sessions,
                {
                  id: timer.sessionId,
                  taskId: timer.taskId,
                  projectId: timer.projectId,
                  completedAt: timer.endAt,
                  duration: timer.total,
                  task: timer.taskTitle,
                },
              ].slice(-5000)
            : state.sessions,
        tasks:
          isFocus && !alreadySaved
            ? state.tasks.map((t) =>
                t.id === timer.taskId ? { ...t, earned: t.earned + 1 } : t,
              )
            : state.tasks,
      };
    }
    case "set-duration": {
      if (
        timer.sessionId ||
        timer.endAt !== null ||
        !Number.isInteger(action.minutes) ||
        action.minutes < 1 ||
        action.minutes > durationLimits[timer.mode]
      )
        return state;
      const total = action.minutes * 60000;
      return { ...state, timer: { ...timer, total, remaining: total } };
    }
    case "reset":
      return { ...state, timer: freshTimer(timer.mode, state.settings) };
    case "mode":
      return { ...state, timer: freshTimer(action.mode, state.settings) };
    case "skip":
      return {
        ...state,
        timer: freshTimer(
          timer.mode === "focus" ? "short" : "focus",
          state.settings,
        ),
      };
    case "settings": {
      const settings = settingsSchema.parse(action.settings);
      return {
        ...state,
        settings,
        timer:
          !timer.sessionId &&
          settings[timer.mode] !== state.settings[timer.mode]
            ? freshTimer(timer.mode, settings)
            : timer,
      };
    }
    case "select":
      return timer.sessionId ? state : { ...state, selectedTask: action.id };
    case "upsert-task":
      if (timer.sessionId) return state;
      return state.tasks.some((t) => t.id === action.task.id)
        ? {
            ...state,
            tasks: state.tasks.map((t) =>
              t.id === action.task.id ? action.task : t,
            ),
          }
        : reducer(state, { type: "add-task", task: action.task });
    case "add-task":
      return state.tasks.length >= 200
        ? state
        : {
            ...state,
            tasks: [...state.tasks, action.task],
            selectedTask: state.selectedTask ?? action.task.id,
          };
    case "toggle-task":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t,
        ),
        selectedTask:
          state.selectedTask === action.id ? null : state.selectedTask,
      };
    case "delete-task":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        selectedTask:
          state.selectedTask === action.id ? null : state.selectedTask,
      };
    case "note":
      return { ...state, note: action.note.slice(0, 2000) };
  }
}
