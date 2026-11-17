import { isTimeSignature, type TimeSignature } from './meter';
import { clampBpm, DEFAULT_BPM, DEFAULT_TIME_SIGNATURE } from './tempo';
import { clampVolume, DEFAULT_VOLUME } from './volume';

export const STORAGE_KEY = 'metronome:settings';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface Settings {
  bpm: number;
  timeSignature: TimeSignature;
  volume: number;
}

export function loadSettings(storage?: StorageLike): Settings {
  const settings: Settings = {
    bpm: DEFAULT_BPM,
    timeSignature: DEFAULT_TIME_SIGNATURE,
    volume: DEFAULT_VOLUME,
  };
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return settings;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return settings;
    }
    const { bpm, timeSignature, volume } = data as Record<string, unknown>;
    if (typeof bpm === 'number') settings.bpm = clampBpm(bpm);
    if (isTimeSignature(timeSignature)) settings.timeSignature = timeSignature;
    if (typeof volume === 'number' && Number.isFinite(volume)) {
      settings.volume = clampVolume(volume);
    }
  } catch {
    return {
      bpm: DEFAULT_BPM,
      timeSignature: DEFAULT_TIME_SIGNATURE,
      volume: DEFAULT_VOLUME,
    };
  }
  return settings;
}

export function saveSettings(
  storage: StorageLike | undefined,
  { bpm, timeSignature, volume }: Settings,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ bpm, timeSignature, volume }));
  } catch {
    // Storage may be full or blocked; persistence is best-effort.
  }
}
