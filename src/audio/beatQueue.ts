import type { AccentLevel } from '../state/meter';

/** One scheduled click, as the visual indicator consumes it. */
export type BeatEvent = {
  /** 0-based index of the beat within its bar. */
  beat: number;
  /** When the click sounds, on the AudioContext clock (seconds). */
  audioTime: number;
  level: AccentLevel;
  beatsPerBar: number;
};

export interface BeatQueue {
  push(e: BeatEvent): void;
  /** Removes and returns the entries with `audioTime <= time`, in order. */
  takeDue(time: number): BeatEvent[];
  clear(): void;
}

export function createBeatQueue(): BeatQueue {
  let entries: BeatEvent[] = [];

  return {
    push(e) {
      entries.push(e);
    },
    takeDue(time) {
      const due = entries.filter((e) => e.audioTime <= time);
      if (due.length > 0) entries = entries.filter((e) => e.audioTime > time);
      return due;
    },
    clear() {
      entries = [];
    },
  };
}
