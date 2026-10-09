// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  proApi,
  seedWorkspace,
  PRO_STORAGE,
  PROFILE_STORAGE,
  readProfile,
  storeProfile,
} from "../src/pro/api";
import { localDate, shiftDate } from "../src/pro/models";
import { initialState, reducer } from "../src/lib/model";
import { liveSessions } from "../src/pro/insights";
const profile = {
  name: "Demo",
  email: "demo@example.com",
  billing: "annual" as const,
  activated: true,
  cancelled: false,
};
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storeProfile(profile);
});
afterEach(() => vi.useRealTimers());
describe("Pro preview repository", () => {
  it("validates transient credentials without storing passwords; logout preserves guest data", async () => {
    const password = "this is a demo password";
    const p = await proApi.authenticate(
      { name: "New Person", email: "new@example.com", password },
      "register",
      "monthly",
    );
    expect(p.activated).toBe(false);
    expect(readProfile()?.billing).toBe("monthly");
    expect(sessionStorage.getItem(PROFILE_STORAGE)).not.toContain(password);
    expect(localStorage.getItem(PRO_STORAGE)).toBeNull();
    await expect(proApi.loadWorkspace()).rejects.toThrow("Open your Pro");
    await proApi.activate(p);
    await proApi.loadWorkspace();
    localStorage.setItem("little-focus:v1", "guest data");
    await proApi.signOut();
    expect(localStorage.getItem("little-focus:v1")).toBe("guest data");
    expect(readProfile()).toBeNull();
  });
  it("persists edits and refuses invalid cross-project links and invalid mix volumes", async () => {
    const workspace = await proApi.loadWorkspace();
    const project = { ...workspace.projects[0], name: "My project" };
    await proApi.mutate({ kind: "project", value: project });
    expect((await proApi.loadWorkspace()).projects[0].name).toBe("My project");
    await expect(
      proApi.mutate({
        kind: "task",
        value: { ...workspace.tasks[0], projectId: crypto.randomUUID() },
      }),
    ).rejects.toThrow("active project");
    await expect(
      proApi.mutate({
        kind: "mix",
        value: {
          ...workspace.mixes[0],
          layers: [{ sound: "rain", volume: 2 }],
        },
      }),
    ).rejects.toThrow();
    await expect(
      proApi.mutate({ kind: "project", value: { ...project, name: "  " } }),
    ).rejects.toThrow();
  });
  it("creates one recurring occurrence today, does not backfill missed dates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:00"));
    const w = seedWorkspace();
    w.tasks = [{ ...w.tasks[1], plannedDate: shiftDate(localDate(), -5) }];
    localStorage.setItem(PRO_STORAGE, JSON.stringify(w));
    const first = await proApi.loadWorkspace();
    const second = await proApi.loadWorkspace();
    expect(first.tasks).toHaveLength(2);
    expect(second.tasks).toHaveLength(2);
    expect(first.tasks[1].plannedDate).toBe("2026-10-08");
    expect(first.tasks[1].templateId).toBe(w.tasks[0].id);
  });
  it("does not recreate a deleted recurring occurrence on the same day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T12:00:00"));
    const w = seedWorkspace();
    w.tasks = [{ ...w.tasks[1], plannedDate: shiftDate(localDate(), -1) }];
    localStorage.setItem(PRO_STORAGE, JSON.stringify(w));
    const expanded = await proApi.loadWorkspace();
    const copy = expanded.tasks.find((t) => t.templateId)!;
    await proApi.mutate({ kind: "delete-task", id: copy.id });
    expect((await proApi.loadWorkspace()).tasks).toHaveLength(1);
    vi.setSystemTime(new Date("2026-10-09T12:00:00"));
    expect((await proApi.loadWorkspace()).tasks).toHaveLength(2);
  });
  it("keeps project attribution after deleting a planned task; active sessions reject task replacement", () => {
    const p = seedWorkspace().projects[0];
    let state = initialState();
    state = reducer(state, {
      type: "upsert-task",
      task: {
        id: "pro-task",
        title: "My work",
        projectId: p.id,
        estimate: 1,
        earned: 0,
        done: false,
      },
    });
    state = reducer(state, { type: "toggle", now: 1000, id: "focus-1" });
    const unchanged = reducer(state, {
      type: "upsert-task",
      task: {
        id: "other",
        title: "Other",
        estimate: 1,
        earned: 0,
        done: false,
      },
    });
    expect(unchanged).toBe(state);
    state = reducer(state, {
      type: "tick",
      now: 1000 + 25 * 60000,
      visible: true,
    });
    state = reducer(state, { type: "delete-task", id: "pro-task" });
    const w = seedWorkspace();
    w.tasks = [];
    expect(liveSessions(state, w)[0].projectId).toBe(p.id);
    expect(state.sessions[0].duration).toBe(25 * 60000);
  });
  it("rejects corrupted workspace rather than replacing user edits silently", async () => {
    localStorage.setItem(PRO_STORAGE, JSON.stringify({ version: 999 }));
    await expect(proApi.loadWorkspace()).rejects.toThrow("could not be read");
    expect(localStorage.getItem(PRO_STORAGE)).toBe('{"version":999}');
  });
});
