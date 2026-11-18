export const DEFAULT_VOLUME = 80;
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 100;

/** Rounds `n` to a whole percent and clamps it to 0–100. Callers check finiteness first. */
export function clampVolume(n: number): number {
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(n)));
}
