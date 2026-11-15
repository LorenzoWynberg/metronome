import { isTimeSignature, type TimeSignature } from './meter';
import { clampBpm, DEFAULT_BPM, DEFAULT_TIME_SIGNATURE } from './tempo';

export const STORAGE_KEY = 'metronome:settings';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface Settings {
  bpm: number;
  timeSignature: TimeSignature;
}

export function loadSettings(storage?: StorageLike): Settings {
  const settings: Settings = {
    bpm: DEFAULT_BPM,
    timeSignature: DEFAULT_TIME_SIGNATURE,
  };
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return settings;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return settings;
    }
    const { bpm, timeSignature } = data as Record<string, unknown>;
    if (typeof bpm === 'number') settings.bpm = clampBpm(bpm);
    if (isTimeSignature(timeSignature)) settings.timeSignature = timeSignature;
  } catch {
    return {
      bpm: DEFAULT_BPM,
      timeSignature: DEFAULT_TIME_SIGNATURE,
    };
  }
  return settings;
}

export function saveSettings(
  storage: StorageLike | undefined,
  { bpm, timeSignature }: Settings,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ bpm, timeSignature }));
  } catch {
    // Storage may be full or blocked; persistence is best-effort.
  }
}
