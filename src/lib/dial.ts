import type { Mode } from "./model";

export const durationLimits: Record<Mode, number> = {
  focus: 120,
  short: 30,
  long: 60,
};
export const pixelsPerMinute = 4;

/** Accumulate travel, not absolute pointer position, so a dial supports repeated swipes. */
export function moveDial(
  pixels: number,
  previousX: number,
  nextX: number,
  maxMinutes: number,
) {
  const nextPixels = Math.min(
    maxMinutes * pixelsPerMinute,
    Math.max(0, pixels + previousX - nextX),
  );
  return {
    pixels: nextPixels,
    minutes: Math.round(nextPixels / pixelsPerMinute),
  };
}

export function keyboardMinutes(
  key: string,
  minutes: number,
  maxMinutes: number,
): number | null {
  const changes: Record<string, number> = {
    ArrowLeft: 1,
    ArrowUp: 1,
    ArrowRight: -1,
    ArrowDown: -1,
    PageUp: 5,
    PageDown: -5,
  };
  if (key === "Home") return 0;
  if (key === "End") return maxMinutes;
  return key in changes
    ? Math.min(maxMinutes, Math.max(0, minutes + changes[key]))
    : null;
}
