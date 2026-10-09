// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { focusAudio } from "../src/lib/audio";
import {
  storeProfile,
  PRO_STORAGE,
  readProfile,
  seedWorkspace,
} from "../src/pro/api";
import { initialState, reducer, STORAGE_KEY } from "../src/lib/model";
vi.mock("../src/components/tomato", () => ({
  default: () => <div aria-label="Animated tomato" />,
}));
vi.mock("../src/lib/audio", () => ({
  focusAudio: {
    unlock: vi.fn().mockResolvedValue(true),
    chime: vi.fn(),
    ambient: vi.fn(),
    ambientMix: vi.fn(),
    stop: vi.fn(),
  },
  FocusAudio: class {
    unlock = vi.fn().mockResolvedValue(true);
    ambient = vi.fn();
    dispose = vi.fn();
  },
}));
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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
function signIn() {
  storeProfile({
    name: "Demo Person",
    email: "demo@example.com",
    billing: "annual",
    activated: true,
    cancelled: false,
  });
}
function navigate(path: string) {
  history.replaceState(null, "", `/#${path}`);
  fireEvent(window, new HashChangeEvent("hashchange"));
}
describe("Pro frontend journeys", () => {
  it("keeps free focus anonymous and shows pricing before login, preserves the chosen interval", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("button", { name: "Start focus" })).toBeTruthy();
    expect(screen.queryByLabelText("Email address")).toBeNull();
    await user.click(screen.getByRole("link", { name: "Pro" }));
    await user.click(await screen.findByRole("button", { name: "Monthly" }));
    expect(screen.getByText("₹149")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /Login & continue/ }));
    expect(await screen.findByLabelText("Email address")).toBeTruthy();
    expect(screen.getByText(/Selected: Pro monthly/)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Explore with demo account" }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Open Pro preview/ }),
    );
    expect(
      await screen.findByRole("heading", { name: /Welcome, Focus/ }),
    ).toBeTruthy();
    expect(readProfile()?.billing).toBe("monthly");
  });
  it("supports create account preview without persisting the password", async () => {
    navigate("/signup");
    const user = userEvent.setup();
    render(<App />);
    await user.type(await screen.findByLabelText("Your name"), "Test Person");
    await user.type(screen.getByLabelText("Email address"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "a long demo password");
    await user.click(
      screen.getByRole("button", { name: /Create account & continue/ }),
    );
    expect(
      await screen.findByRole("button", { name: /Open Pro preview/ }),
    ).toBeTruthy();
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(
      "a long demo password",
    );
    expect(readProfile()?.name).toBe("Test Person");
  });
  it("creates and archives a project, plans a task, and brings it to the real timer", async () => {
    signIn();
    navigate("/pro/projects");
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: /New project/ }),
    );
    await user.type(screen.getByLabelText("Name"), "Build the API");
    await user.click(screen.getByRole("button", { name: "Save project" }));
    const heading = await screen.findByRole("heading", {
      name: "Build the API",
    });
    expect(heading).toBeTruthy();
    const card = heading.closest("article")!;
    await user.click(
      within(card).getByRole("button", { name: "Archive project" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Build the API" }),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("link", { name: "Planner" }));
    await user.click(await screen.findByRole("button", { name: /Add task/ }));
    await user.type(
      screen.getByLabelText("Task title"),
      "Write the API contract",
    );
    await user.click(screen.getByRole("button", { name: "Save task" }));
    const task = await screen.findByRole("heading", {
      name: "Write the API contract",
    });
    await user.click(
      within(task.closest("article")!).getByRole("button", { name: "Focus" }),
    );
    expect(
      await screen.findByRole("button", { name: "Start focus" }),
    ).toBeTruthy();
    expect(
      screen.getAllByText("Write the API contract").length,
    ).toBeGreaterThan(0);
  });
  it("applies a routine and protects a paused session from routine changes", async () => {
    signIn();
    navigate("/pro/routines");
    const user = userEvent.setup();
    const app = render(<App />);
    const heading = await screen.findByRole("heading", { name: "Deep work" });
    await user.click(
      within(heading.closest("article")!).getByRole("button", {
        name: "Use routine",
      }),
    );
    expect(await screen.findByRole("timer")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toBe("50:00");
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    await user.click(await screen.findByRole("button", { name: "Pause" }));
    navigate("/pro/routines");
    const buttons = await screen.findAllByRole("button", {
      name: "Use routine",
    });
    expect(buttons.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    app.unmount();
  });
  it("separates sample insights and saves a sound mix and an accent", async () => {
    signIn();
    navigate("/pro/insights");
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByText("Your next session is a beginning."),
    ).toBeTruthy();
    await user.click(screen.getByRole("combobox", { name: "Insights data" }));
    await user.click(
      await screen.findByRole("option", { name: "Sample data" }),
    );
    expect(
      await screen.findByRole("img", { name: /focus minutes/ }),
    ).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Studio" }));
    await user.clear(await screen.findByLabelText("Mix name"));
    await user.type(screen.getByLabelText("Mix name"), "Desk rain");
    await user.click(screen.getByRole("button", { name: "Save mix" }));
    expect(await screen.findByText("Mix saved.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Sage" }));
    await waitFor(() =>
      expect(document.documentElement.dataset.accent).toBe("sage"),
    );
    expect(
      JSON.parse(localStorage.getItem(PRO_STORAGE)!).mixes.some(
        (m: { name: string }) => m.name === "Desk rain",
      ),
    ).toBe(true);
    const mix = screen.getByText("Desk rain").closest<HTMLElement>(".pro-saved-mix")!;
    await user.click(
      within(mix).getByRole("button", { name: "Use for focus" }),
    );
    expect(
      await screen.findByRole("combobox", { name: "Ambient sound" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Ambient sound" }).textContent,
    ).toContain("Desk rain");
    await user.click(screen.getByRole("button", { name: "Start focus" }));
    expect(focusAudio.ambientMix).toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Pause" }));
  });
  it("guards direct Pro routes and logout never removes free timer state", async () => {
    navigate("/pro/planner");
    const user = userEvent.setup();
    const app = render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Your Pro space is waiting.",
      }),
    ).toBeTruthy();
    app.unmount();
    signIn();
    let state = initialState();
    state = reducer(state, { type: "note", note: "Keep my free notes" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    navigate("/pro/account");
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Log out of preview" }),
    );
    expect(
      await screen.findByRole("button", { name: "Start focus" }),
    ).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).note).toBe(
      "Keep my free notes",
    );
    expect(readProfile()).toBeNull();
  });
});
