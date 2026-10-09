// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import Tomato from "../src/components/tomato";

// Exercise the real pointer/keyboard control on its non-WebGL fallback.
vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof import("three")>()),
  WebGLRenderer: class {
    constructor() {
      throw new Error("WebGL unavailable in DOM tests");
    }
  },
}));
const onStep = vi.fn();
const onEngage = vi.fn();
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [minutes, setMinutes] = useState(25),
    [preview, setPreview] = useState<number | null>(null);
  return (
    <>
      <Tomato
        running={false}
        progress={0}
        minutes={minutes}
        previewMinutes={preview}
        maxMinutes={120}
        disabled={disabled}
        onEngage={onEngage}
        onStep={onStep}
        onPreview={setPreview}
        onCancel={() => setPreview(null)}
        onApply={() => {
          if (preview && preview > 0) setMinutes(preview);
          setPreview(null);
        }}
      />
      <output data-testid="actual">{minutes}</output>
      <output data-testid="display">{preview ?? minutes}</output>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      isPrimary: boolean;
      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
        this.isPrimary = options.isPrimary ?? true;
      }
    },
  );
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function control(disabled = false) {
  render(<Harness disabled={disabled} />);
  const dial = screen.getByRole("slider", { name: "Tomato duration dial" });
  Object.defineProperty(dial, "getBoundingClientRect", {
    value: () => ({
      left: 0,
      top: 0,
      width: 320,
      height: 274,
      right: 320,
      bottom: 274,
    }),
  });
  return dial;
}
describe("Tomato pointer and keyboard interaction", () => {
  it("previews zero on touch, supports repeated left swipes, and commits only on apply", () => {
    const dial = control();
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 1,
      clientX: 220,
      clientY: 90,
    });
    expect(onEngage).toHaveBeenCalledTimes(1);
    expect(onStep).not.toHaveBeenCalled();
    expect(screen.getByTestId("display").textContent).toBe("0");
    expect(screen.getByTestId("actual").textContent).toBe("25");
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 120, clientY: 90 });
    fireEvent.pointerUp(dial, { pointerId: 1 });
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 2,
      clientX: 220,
      clientY: 90,
    });
    fireEvent.pointerMove(dial, { pointerId: 2, clientX: 120, clientY: 90 });
    fireEvent.pointerUp(dial, { pointerId: 2 });
    expect(onStep).toHaveBeenCalledTimes(2);
    fireEvent.pointerMove(dial, { pointerId: 2, clientX: 119, clientY: 90 });
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("display").textContent).toBe("50");
    expect(screen.getByTestId("actual").textContent).toBe("25");
    fireEvent.keyDown(dial, { key: "Enter" });
    expect(screen.getByTestId("actual").textContent).toBe("50");
  });
  it("restores the old duration on pointer cancellation or Escape", () => {
    const dial = control();
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 1,
      clientX: 220,
      clientY: 90,
    });
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 20, clientY: 90 });
    fireEvent.pointerCancel(dial, { pointerId: 1 });
    expect(screen.getByTestId("display").textContent).toBe("25");
    fireEvent.keyDown(dial, { key: "Enter" });
    fireEvent.keyDown(dial, { key: "ArrowLeft" });
    expect(screen.getByTestId("display").textContent).toBe("1");
    fireEvent.keyDown(dial, { key: "Escape" });
    expect(screen.getByTestId("display").textContent).toBe("25");
  });
  it("ignores the lower half, unrelated pointers, and zero-minute apply", () => {
    const dial = control();
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 1,
      clientX: 220,
      clientY: 225,
    });
    expect(screen.getByTestId("display").textContent).toBe("25");
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 1,
      clientX: 220,
      clientY: 90,
    });
    fireEvent.pointerMove(dial, { pointerId: 2, clientX: 20, clientY: 90 });
    fireEvent.keyDown(dial, { key: "Enter" });
    expect(screen.getByTestId("actual").textContent).toBe("25");
    expect(screen.getByTestId("display").textContent).toBe("0");
  });
  it("protects active and paused sessions against pointer and keyboard input", () => {
    const dial = control(true);
    fireEvent.pointerDown(dial, {
      button: 0,
      pointerId: 1,
      clientX: 220,
      clientY: 90,
    });
    fireEvent.pointerMove(dial, { pointerId: 1, clientX: 20, clientY: 90 });
    fireEvent.keyDown(dial, { key: "ArrowLeft" });
    expect(screen.getByTestId("display").textContent).toBe("25");
    expect(dial.getAttribute("aria-disabled")).toBe("true");
    expect(onEngage).not.toHaveBeenCalled();
    expect(onStep).not.toHaveBeenCalled();
  });
});
