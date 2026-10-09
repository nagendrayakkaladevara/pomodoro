import { describe, expect, it } from "vitest";
import { keyboardMinutes, moveDial } from "../src/lib/dial";
import {
  defaultSettings,
  initialState,
  parseState,
  reducer,
} from "../src/lib/model";

describe("Duration dial", () => {
  it("adds time turning left, subtracts turning right, and accumulates repeated swipes", () => {
    const first = moveDial(0, 220, 120, 120);
    expect(first.minutes).toBe(25);
    const second = moveDial(first.pixels, 220, 120, 120);
    expect(second.minutes).toBe(50);
    expect(moveDial(second.pixels, 100, 140, 120).minutes).toBe(40);
  });
  it("clamps both directions without hidden travel beyond the limits", () => {
    expect(moveDial(0, 100, 999, 30)).toEqual({ pixels: 0, minutes: 0 });
    expect(moveDial(0, 999, 0, 30)).toEqual({ pixels: 120, minutes: 30 });
    expect(moveDial(120, 100, 104, 30).minutes).toBe(29);
    expect(keyboardMinutes("ArrowLeft", 0, 120)).toBe(1);
    expect(keyboardMinutes("End", 5, 30)).toBe(30);
  });
  it("saves a custom duration without changing the default and preserves it when changing sounds or theme", () => {
    let state = reducer(initialState(), { type: "set-duration", minutes: 42 });
    expect(state.timer.remaining).toBe(2520000);
    expect(state.settings.focus).toBe(25);
    state = reducer(state, {
      type: "settings",
      settings: { ...defaultSettings, ambient: "piano", theme: "dark" },
    });
    expect(state.timer.remaining).toBe(2520000);
    expect(parseState(JSON.stringify(state))?.timer.total).toBe(2520000);
  });
  it("rejects zero, out-of-range, fractional, and active-session duration changes", () => {
    const state = initialState();
    for (const minutes of [0, -1, 121, 1.5, NaN])
      expect(reducer(state, { type: "set-duration", minutes })).toBe(state);
    const running = reducer(state, { type: "toggle", now: 1000, id: "one" });
    expect(reducer(running, { type: "set-duration", minutes: 40 })).toBe(
      running,
    );
    const paused = reducer(running, { type: "toggle", now: 2000, id: "two" });
    expect(reducer(paused, { type: "set-duration", minutes: 40 })).toBe(paused);
    const short = reducer(state, { type: "mode", mode: "short" });
    expect(reducer(short, { type: "set-duration", minutes: 31 })).toBe(short);
  });
});
