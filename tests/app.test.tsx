// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { initialState, reducer, STORAGE_KEY } from "../src/lib/model";

vi.mock("../src/components/tomato", () => ({
  default: () => <div aria-label="Animated tomato" />,
}));
vi.mock("../src/lib/audio", () => ({
  focusAudio: {
    unlock: vi.fn().mockResolvedValue(undefined),
    chime: vi.fn(),
    ambient: vi.fn(),
    ambientMix: vi.fn(),
    stop: vi.fn(),
  },
}));
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Focus experience", () => {
  it("starts, pauses, and preserves the paused timer through a reload", async () => {
    const user = userEvent.setup();
    const app = render(<App />);
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    await user.click(await screen.findByRole("button", { name: "Pause" }));
    expect(await screen.findByRole("button", { name: "Resume" })).toBeTruthy();
    app.unmount();
    render(<App />);
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
  });
  it("adds a task, selects it, completes it, and can reopen it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Add task" }));
    await user.type(
      screen.getByLabelText("What would you like to focus on?"),
      "Review the API",
    );
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(
      screen
        .getByRole("button", { name: "Focus on Review the API" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(
      screen.getByRole("button", { name: "Mark Review the API complete" }),
    );
    await user.click(screen.getByRole("button", { name: "1 completed" }));
    await user.click(
      screen.getByRole("button", { name: "Reopen Review the API" }),
    );
    expect(
      screen.getByRole("button", { name: "Mark Review the API complete" }),
    ).toBeTruthy();
  });
  it("asks before discarding an active session and cancellation keeps it running", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Pause" });
    await user.click(screen.getByRole("tab", { name: "Short break" }));
    expect(
      screen.getByRole("dialog", { name: "Leave this session?" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Keep going" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Focus" }).getAttribute("aria-selected"),
    ).toBe("true");
  });
  it("saves edited durations and notes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Timer settings" }));
    const input = screen.getByRole("spinbutton", { name: /Focus/ });
    fireEvent.change(input, { target: { value: "50" } });
    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("timer").textContent).toBe("50:00");
    await user.click(screen.getByText("PARK A THOUGHT"));
    await user.type(
      screen.getByLabelText("Distraction notes"),
      "Read about signals later",
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).note).toBe(
      "Read about signals later",
    );
  });
  it("recovers an expired focus exactly once and shows the break", async () => {
    let state = initialState();
    state = reducer(state, {
      type: "toggle",
      now: Date.now() - 1600000,
      id: "expired-session",
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(<App />);
    expect(
      await screen.findByRole("button", { name: "Start break" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).sessions,
      ).toHaveLength(1),
    );
    expect(
      screen
        .getByRole("tab", { name: "Short break" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
  it("opens the features page and keeps an active timer intact on return", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    await screen.findByRole("button", { name: "Pause" });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    await user.click(
      screen.getByRole("link", { name: "Application features" }),
    );
    await screen.findByRole("heading", {
      name: "Small details. Better focus.",
    });
    expect(screen.queryByRole("button", { name: "Start focus" })).toBeNull();
    await user.click(screen.getByRole("link", { name: /Back to your focus/ }));
    await screen.findByRole("button", { name: "Pause" });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).timer.endAt).toBe(
      saved.timer.endAt,
    );
  });
  it("uses the shadcn selector for melodic sounds and previews without starting a timer", async () => {
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole("combobox", { name: "Ambient sound" }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("option", { name: "Gentle keys" });
    await user.click(screen.getByRole("option", { name: "Gentle keys" }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.ambient,
      ).toBe("piano"),
    );
    await user.click(
      screen.getByRole("button", { name: "Preview sound for 8 seconds" }),
    );
    expect(
      await screen.findByRole("button", { name: "Stop sound preview" }),
    ).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).timer.endAt,
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Stop sound preview" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Preview sound for 8 seconds",
      }),
    ).toBeTruthy();
  });
});
