import { MAX_VOLUME } from '../state/volume';

/**
 * Maps a slider percentage (0–100) to a linear gain. A squared curve is
 * roughly perceptually even per slider step; 0 is exactly silent and 100
 * exactly unity gain.
 */
export function volumeToGain(pct: number): number {
  const x = Math.min(1, Math.max(0, pct / MAX_VOLUME));
  return x * x;
}
