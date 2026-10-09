import seed from "./data/seed.json";
import { z } from "zod";
import {
  workspaceSchema,
  profileSchema,
  billingSchema,
  projectSchema,
  taskSchema,
  routineSchema,
  mixSchema,
  preferencesSchema,
  loginSchema,
  registerSchema,
  localDate,
  type Workspace,
  type Profile,
  type Billing,
  type Project,
  type ProTask,
  type Routine,
  type Mix,
} from "./models";
export const PRO_STORAGE = "little-focus:pro-preview:v1";
export const PROFILE_STORAGE = "little-focus:demo-profile:v1";
const PLAN_STORAGE = "little-focus:selected-plan:v1";
export type WorkspaceCommand =
  | { kind: "project"; value: Project }
  | { kind: "task"; value: ProTask }
  | { kind: "routine"; value: Routine }
  | { kind: "mix"; value: Mix }
  | { kind: "delete-task" | "delete-routine" | "delete-mix"; id: string }
  | { kind: "preferences"; value: Workspace["preferences"] };
export interface ProRepository {
  loadWorkspace(): Promise<Workspace>;
  mutate(command: WorkspaceCommand): Promise<Workspace>;
  authenticate(
    input: unknown,
    mode: "login" | "register",
    billing: Billing,
  ): Promise<Profile>;
  activate(profile: Profile): Promise<Profile>;
  signOut(): Promise<void>;
}
export function seedWorkspace(): Workspace {
  const today = localDate();
  return workspaceSchema.parse({
    ...seed,
    tasks: seed.tasks.map((t) => ({ ...t, plannedDate: today })),
    sampleSessions: seed.sampleSessions.map((s) => {
      const d = new Date(`${today}T12:00:00`);
      d.setDate(d.getDate() + s.dayOffset);
      return { ...s, completedAt: d.getTime() };
    }),
  });
}
export function readProfile(): Profile | null {
  try {
    return profileSchema.parse(
      JSON.parse(sessionStorage.getItem(PROFILE_STORAGE) ?? "null"),
    );
  } catch {
    return null;
  }
}
export function selectedBilling(): Billing {
  try {
    return billingSchema.parse(localStorage.getItem(PLAN_STORAGE));
  } catch {
    return "annual";
  }
}
export function rememberBilling(value: Billing) {
  try {
    localStorage.setItem(PLAN_STORAGE, value);
  } catch {
    /* Current page still holds the choice. */
  }
}
export function storeProfile(value: Profile) {
  sessionStorage.setItem(
    PROFILE_STORAGE,
    JSON.stringify(profileSchema.parse(value)),
  );
}
function readWorkspace() {
  const raw = localStorage.getItem(PRO_STORAGE);
  if (!raw) {
    const seeded = seedWorkspace();
    localStorage.setItem(PRO_STORAGE, JSON.stringify(seeded));
    return seeded;
  }
  const parsed = workspaceSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error(
      "Your preview data could not be read. Export or reset it from Account.",
    );
  return parsed.data;
}
function upsert<T extends { id: string }>(items: T[], value: T) {
  return items.some((i) => i.id === value.id)
    ? items.map((i) => (i.id === value.id ? value : i))
    : [...items, value];
}
function assertPreview() {
  if (!readProfile()?.activated)
    throw new Error("Open your Pro preview to continue.");
}
export const proApi: ProRepository = {
  async loadWorkspace() {
    assertPreview();
    const state = readWorkspace(),
      today = localDate(),
      weekday = new Date().getDay();
    const created: ProTask[] = [];
    for (const task of state.tasks.filter(
      (t) => !t.templateId && t.recurrence !== "none" && t.plannedDate < today,
    )) {
      if (task.recurrence === "weekdays" && (weekday === 0 || weekday === 6))
        continue;
      if (
        task.projectId &&
        state.projects.find((p) => p.id === task.projectId)?.archived
      )
        continue;
      if (
        state.tasks.some(
          (t) => t.templateId === task.id && t.plannedDate === today,
        ) ||
        state.skippedOccurrences.some(
          (s) => s.templateId === task.id && s.date === today,
        )
      )
        continue;
      if (state.tasks.length + created.length >= 500) break;
      created.push({
        ...task,
        id: crypto.randomUUID(),
        templateId: task.id,
        plannedDate: today,
        done: false,
      });
    }
    if (created.length) {
      state.tasks.push(...created);
      localStorage.setItem(
        PRO_STORAGE,
        JSON.stringify(workspaceSchema.parse(state)),
      );
    }
    return state;
  },
  async mutate(command) {
    assertPreview();
    const state = readWorkspace();
    switch (command.kind) {
      case "project":
        state.projects = upsert(
          state.projects,
          projectSchema.parse(command.value),
        );
        break;
      case "task": {
        const task = taskSchema.parse(command.value);
        if (
          task.projectId &&
          !state.projects.some(
            (p) =>
              p.id === task.projectId &&
              (!p.archived ||
                state.tasks.some(
                  (t) => t.id === task.id && t.projectId === p.id,
                )),
          )
        )
          throw new Error("Choose an active project.");
        const previous = state.tasks.find((t) => t.id === task.id);
        if (
          task.templateId &&
          previous &&
          previous.recurrence !== task.recurrence
        ) {
          state.tasks = state.tasks.map((t) =>
            t.id === task.templateId
              ? { ...t, recurrence: task.recurrence }
              : t,
          );
        }
        state.tasks = upsert(state.tasks, task);
        break;
      }
      case "routine":
        state.routines = upsert(
          state.routines,
          routineSchema.parse(command.value),
        );
        break;
      case "mix":
        state.mixes = upsert(state.mixes, mixSchema.parse(command.value));
        break;
      case "preferences":
        state.preferences = preferencesSchema.parse(command.value);
        break;
      case "delete-task": {
        const task = state.tasks.find((t) => t.id === command.id);
        if (task?.templateId)
          state.skippedOccurrences = [
            ...state.skippedOccurrences,
            { templateId: task.templateId, date: task.plannedDate },
          ].slice(-500);
        state.tasks = state.tasks.filter(
          (t) => t.id !== command.id && t.templateId !== command.id,
        );
        break;
      }
      case "delete-routine":
        state.routines = state.routines.filter((t) => t.id !== command.id);
        break;
      case "delete-mix":
        state.mixes = state.mixes.filter((t) => t.id !== command.id);
        break;
    }
    const valid = workspaceSchema.parse(state);
    localStorage.setItem(PRO_STORAGE, JSON.stringify(valid));
    return valid;
  },
  async authenticate(input, mode, billing) {
    // Preview only. Validate transient credentials, then discard the password.
    const credentials =
      mode === "register"
        ? registerSchema.parse(input)
        : loginSchema.parse(input);
    const profile: Profile = {
      name: "name" in credentials ? String(credentials.name) : "Focus explorer",
      email: credentials.email,
      billing,
      activated: false,
      cancelled: false,
    };
    storeProfile(profile);
    return profile;
  },
  async activate(profile) {
    const next = { ...profile, activated: true };
    storeProfile(next);
    return next;
  },
  async signOut() {
    sessionStorage.removeItem(PROFILE_STORAGE);
  },
};
export function errorMessage(error: unknown) {
  return error instanceof z.ZodError
    ? (error.issues[0]?.message ?? "Check your input.")
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
}
