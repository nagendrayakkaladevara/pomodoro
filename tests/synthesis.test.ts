import { expect, it } from "vitest";
import { melodyKinds, synthesizeMelody } from "../src/lib/synthesis";

it.each(melodyKinds)(
  "%s creates finite, audible samples without clipping or a sharp loop boundary",
  (kind) => {
    const samples = synthesizeMelody(kind, 8000);
    let energy = 0,
      peak = 0;
    for (const sample of samples) {
      expect(Number.isFinite(sample)).toBe(true);
      energy += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    expect(peak).toBeLessThan(1);
    expect(Math.sqrt(energy / samples.length)).toBeGreaterThan(0.01);
    expect(Math.abs(samples[0] - samples[samples.length - 1])).toBeLessThan(
      0.03,
    );
  },
);
