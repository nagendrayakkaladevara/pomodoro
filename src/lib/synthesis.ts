import type { Soundscape } from "./soundscapes";

export const melodyKinds = ["piano", "music-box", "drift"] as const;

/** Original, loopable phrases. Tails wrap around so the loop has no abrupt cut. */
export function synthesizeMelody(
  kind: (typeof melodyKinds)[number],
  sampleRate: number,
) {
  const duration = kind === "drift" ? 48 : 32;
  const samples = new Float32Array(duration * sampleRate);
  const addNote = (midi: number, at: number, length: number, gain: number) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const count = Math.floor(length * sampleRate);
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / (kind === "drift" ? 0.9 : 0.015));
      const release = Math.min(1, (length - t) / 0.4);
      const envelope =
        kind === "drift"
          ? Math.sin((Math.PI * t) / length) ** 2
          : Math.exp(-t * (kind === "music-box" ? 1.5 : 1.1));
      const phase = 2 * Math.PI * frequency * t;
      const harmonics =
        kind === "music-box"
          ? 0.24 * Math.sin(phase * 3) * Math.exp(-t * 3)
          : 0.16 * Math.sin(phase * 2) * Math.exp(-t * 2);
      const value =
        (Math.sin(phase) + harmonics) * attack * release * envelope * gain;
      samples[(Math.floor(at * sampleRate) + i) % samples.length] += value;
    }
  };
  if (kind === "drift") {
    [
      [48, 55, 60, 64],
      [45, 52, 57, 60],
      [41, 48, 53, 57],
      [43, 50, 55, 62],
    ].forEach((chord, i) =>
      chord.forEach((note) => addNote(note, i * 12, 15, 0.12)),
    );
  } else {
    const phrase =
      kind === "piano"
        ? [60, 64, 67, 72, 69, 67, 64, 62, 65, 69, 72, 69, 67, 62, 64, 60]
        : [72, 79, 76, 81, 79, 76, 74, 72, 77, 81, 84, 79, 76, 74, 79, 72];
    phrase.forEach((note, i) => addNote(note, i * 2, 4, 0.46));
    [48, 45, 41, 43].forEach((note, i) =>
      addNote(kind === "music-box" ? note + 12 : note, i * 8, 5, 0.15),
    );
  }
  return samples;
}

export function synthesizeNoise(
  kind: Exclude<Soundscape, "off" | (typeof melodyKinds)[number]>,
  sampleRate: number,
) {
  const samples = new Float32Array(sampleRate * (kind === "ocean" ? 16 : 4));
  let last = 0;
  for (let i = 0; i < samples.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    const wave =
      kind === "ocean"
        ? 0.28 + 0.72 * Math.sin((Math.PI * i) / (sampleRate * 8)) ** 2
        : 1;
    const edge = Math.min(1, i / 100, (samples.length - i - 1) / 100);
    samples[i] =
      (kind === "brown"
        ? last * 3.5
        : kind === "ocean"
          ? last * 2.5 + white * 0.1
          : white * 0.45 + last) *
      wave *
      edge;
  }
  return samples;
}
