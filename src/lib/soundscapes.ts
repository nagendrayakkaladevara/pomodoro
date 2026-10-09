export const soundscapes = [
  { value: "off", label: "Just silence", group: "Quiet" },
  { value: "rain", label: "Soft rain", group: "Nature & noise" },
  { value: "brown", label: "Brown noise", group: "Nature & noise" },
  { value: "ocean", label: "Ocean waves", group: "Nature & noise" },
  { value: "piano", label: "Gentle keys", group: "Melodies" },
  { value: "music-box", label: "Music box", group: "Melodies" },
  { value: "drift", label: "Slow drift", group: "Melodies" },
] as const;
export type Soundscape = (typeof soundscapes)[number]["value"];
export const soundscapeGroups = [
  "Quiet",
  "Nature & noise",
  "Melodies",
] as const;
