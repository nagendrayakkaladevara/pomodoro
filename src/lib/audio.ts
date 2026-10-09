import { synthesizeMelody, synthesizeNoise } from "./synthesis";
import type { Soundscape } from "./soundscapes";

export class FocusAudio {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private current = "off";
  private buffers = new Map<Soundscape, AudioBuffer>();
  private lastTick = -Infinity;
  private mixNodes: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  async unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
    } catch {
      /* Sound is optional; the timer remains usable. */
    }
    return this.context?.state === "running";
  }
  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
  tick(volume: number) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || volume <= 0) return;
    const at = ctx.currentTime;
    // Rate-limit rapid drags so ticks never pile up into a harsh buzz.
    if (at - this.lastTick < 0.045) return;
    this.lastTick = at;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(1100, at);
    oscillator.frequency.exponentialRampToValueAtTime(350, at + 0.025);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(Math.min(1, volume) * 0.18, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.04);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  chime(volume: number) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.18;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(volume * 0.22, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 1.4);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
  ambient(kind: Soundscape, volume: number) {
    if (kind === "off") {
      this.stop();
      return;
    }
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    if (kind === this.current && this.gain) {
      this.gain.gain.setTargetAtTime(volume * 0.3, ctx.currentTime, 0.12);
      return;
    }
    this.stop();
    const buffer = this.getBuffer(kind, ctx);
    this.source = ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.gain = ctx.createGain();
    this.gain.gain.value = volume * 0.3;
    this.source.connect(this.gain);
    this.gain.connect(ctx.destination);
    this.source.start();
    this.current = kind;
  }
  private getBuffer(kind: Exclude<Soundscape, "off">, ctx: AudioContext) {
    let buffer = this.buffers.get(kind);
    if (!buffer) {
      const rate = 24000;
      const samples =
        kind === "piano" || kind === "music-box" || kind === "drift"
          ? synthesizeMelody(kind, rate)
          : synthesizeNoise(kind, rate);
      buffer = ctx.createBuffer(1, samples.length, rate);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(kind, buffer);
    }
    return buffer;
  }
  ambientMix(
    layers: { sound: Exclude<Soundscape, "off">; volume: number }[],
    volume: number,
  ) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;
    this.stop();
    // Three quiet layers stay below the output headroom at maximum volume.
    this.mixNodes = layers.slice(0, 3).map((layer) => {
      const source = ctx.createBufferSource(),
        gain = ctx.createGain();
      source.buffer = this.getBuffer(layer.sound, ctx);
      source.loop = true;
      gain.gain.value = layer.volume * volume * 0.25;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      return { source, gain };
    });
    this.current = "mix";
  }
  stop() {
    this.mixNodes.forEach(({ source, gain }) => {
      source.stop();
      source.disconnect();
      gain.disconnect();
    });
    this.mixNodes = [];
    this.source?.stop();
    this.source?.disconnect();
    this.gain?.disconnect();
    this.source = null;
    this.gain = null;
    this.current = "off";
  }
}
export const focusAudio = new FocusAudio();
