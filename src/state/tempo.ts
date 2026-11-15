import type { TimeSignature } from './meter';

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 120;
export const DEFAULT_TIME_SIGNATURE: TimeSignature = '4/4';

export function clampBpm(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));
}
