import { clampBpm } from './tempo';

const MAX_TAPS = 5;
const RESET_GAP_MS = 2000;

export interface TapTempo {
  /** Record a tap; returns the averaged BPM, or null until two taps exist. */
  tap(): number | null;
  reset(): void;
}

export function createTapTempo(
  now: () => number = () => performance.now(),
): TapTempo {
  let taps: number[] = [];

  return {
    tap() {
      const t = now();
      const last = taps[taps.length - 1];
      if (last !== undefined && t - last > RESET_GAP_MS) taps = [];
      taps.push(t);
      if (taps.length > MAX_TAPS) taps.shift();
      if (taps.length < 2) return null;
      const mean = (t - (taps[0] as number)) / (taps.length - 1);
      if (mean <= 0) return null;
      return clampBpm(60000 / mean);
    },
    reset() {
      taps = [];
    },
  };
}
