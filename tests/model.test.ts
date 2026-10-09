import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  formatTime,
  initialState,
  parseState,
  reducer,
  remainingTime,
  type State,
} from "../src/lib/model";

const start = (state = initialState(), now = 1000, id = "session-1") =>
  reducer(state, { type: "toggle", now, id });
const finish = (state: State, visible = true) =>
  reducer(state, { type: "tick", now: state.timer.endAt!, visible });
describe("Pomodoro sessions", () => {
  it("uses the actual deadline after throttling, rather than counting ticks", () => {
    const state = start();
    expect(remainingTime(state.timer, 601000)).toBe(900000);
    expect(reducer(state, { type: "tick", now: 601000, visible: true })).toBe(
      state,
    );
    expect(remainingTime(state.timer, 5000000)).toBe(0);
  });
  it("pauses, survives serialization, and resumes exactly the remaining duration", () => {
    const paused = reducer(start(), {
      type: "toggle",
      now: 61000,
      id: "ignored",
    });
    const restored = parseState(JSON.stringify(paused))!;
    expect(restored.timer.remaining).toBe(24 * 60000);
    expect(restored.timer.endAt).toBeNull();
    const resumed = start(restored, 100000, "not-a-new-session");
    expect(resumed.timer.endAt).toBe(1540000);
    expect(resumed.timer.sessionId).toBe("session-1");
  });
  it("records one finished focus session and prepares a paused short break", () => {
    const done = finish(start());
    expect(done.sessions).toHaveLength(1);
    expect(done.sessions[0].duration).toBe(25 * 60000);
    expect(done.timer.mode).toBe("short");
    expect(done.timer.endAt).toBeNull();
    expect(
      reducer(done, { type: "tick", now: 1e8, visible: true }).sessions,
    ).toHaveLength(1);
  });
  it("chooses a long break after four completed focus sessions", () => {
    let state = initialState();
    for (let i = 0; i < 4; i++) {
      state = finish(start(state, 1000, `focus-${i}`));
      if (i < 3) {
        expect(state.timer.mode).toBe("short");
        state = finish(start(state, 2000000, `break-${i}`));
      }
    }
    expect(state.timer.mode).toBe("long");
    expect(state.timer.total).toBe(15 * 60000);
    expect(state.sessions).toHaveLength(4);
    expect(finish(start(state)).timer.mode).toBe("focus");
  });
  it("only auto-starts a break for a timely foreground completion", () => {
    const configured = {
      ...initialState(),
      settings: { ...defaultSettings, autoBreak: true },
    };
    const running = start(configured);
    expect(finish(running).timer.endAt).not.toBeNull();
    expect(finish(running, false).timer.endAt).toBeNull();
    const delayed = reducer(running, {
      type: "tick",
      now: running.timer.endAt! + 3600000,
      visible: true,
    });
    expect(delayed.timer.endAt).toBeNull();
    expect(delayed.sessions).toHaveLength(1);
  });
  it("does not reward a skipped or reset session", () => {
    expect(reducer(start(), { type: "skip" }).sessions).toHaveLength(0);
    const reset = reducer(start(), { type: "reset" });
    expect(reset.sessions).toHaveLength(0);
    expect(reset.timer.endAt).toBeNull();
    expect(reset.timer.remaining).toBe(1500000);
  });
  it("handles pause exactly at completion without losing a session", () => {
    const running = start();
    const ended = reducer(running, {
      type: "toggle",
      now: running.timer.endAt!,
      id: "new",
    });
    expect(ended.timer.mode).toBe("short");
    expect(ended.sessions).toHaveLength(1);
  });
  it("keeps the task snapshot and awards it even if another task is selected or removed", () => {
    let state = reducer(initialState(), {
      type: "add-task",
      task: {
        id: "task-1",
        title: "Write proposal",
        done: false,
        earned: 0,
        estimate: 2,
      },
    });
    state = start(state);
    expect(reducer(state, { type: "select", id: null })).toBe(state);
    const done = finish(state);
    expect(done.tasks[0].earned).toBe(1);
    expect(done.sessions[0].task).toBe("Write proposal");
    const deleted = reducer(state, { type: "delete-task", id: "task-1" });
    expect(finish(deleted).sessions[0].task).toBe("Write proposal");
  });
  it("applies edited durations to the next session without disturbing the current one", () => {
    const running = start();
    const edited = reducer(running, {
      type: "settings",
      settings: { ...defaultSettings, focus: 50, short: 10 },
    });
    expect(edited.timer).toEqual(running.timer);
    expect(finish(edited).timer.total).toBe(600000);
    expect(reducer(edited, { type: "reset" }).timer.total).toBe(3000000);
  });
  it("rejects corrupt storage and out-of-range settings", () => {
    expect(parseState("invalid")).toBeNull();
    expect(parseState('{"version":8}')).toBeNull();
    expect(
      parseState(
        JSON.stringify({
          ...initialState(),
          settings: { ...defaultSettings, focus: -1 },
        }),
      ),
    ).toBeNull();
    expect(parseState(JSON.stringify(initialState()))).toEqual(initialState());
  });
  it("uses ceiling seconds, including the final fraction of a second", () => {
    expect(formatTime(59999)).toBe("01:00");
    expect(formatTime(1)).toBe("00:01");
    expect(formatTime(0)).toBe("00:00");
  });
});
