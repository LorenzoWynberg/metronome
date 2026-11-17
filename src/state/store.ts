import { isTimeSignature, type TimeSignature } from './meter';
import { loadSettings, saveSettings, type StorageLike } from './persistence';
import { clampBpm } from './tempo';
import { clampVolume } from './volume';

export interface MetronomeState {
  bpm: number;
  timeSignature: TimeSignature;
  volume: number;
  running: boolean;
}

export interface Store {
  getState(): MetronomeState;
  setState(patch: Partial<MetronomeState>): void;
  subscribe(listener: (state: MetronomeState) => void): () => void;
}

export function createStore(opts: { storage?: StorageLike } = {}): Store {
  const { storage } = opts;
  let state: MetronomeState = { ...loadSettings(storage), running: false };
  const listeners = new Set<(state: MetronomeState) => void>();

  return {
    getState: () => state,
    setState(patch) {
      const next: MetronomeState = { ...state };
      if (typeof patch.bpm === 'number') next.bpm = clampBpm(patch.bpm);
      if (isTimeSignature(patch.timeSignature)) {
        next.timeSignature = patch.timeSignature;
      }
      if (typeof patch.volume === 'number' && Number.isFinite(patch.volume)) {
        next.volume = clampVolume(patch.volume);
      }
      if (typeof patch.running === 'boolean') next.running = patch.running;

      const settingsChanged =
        next.bpm !== state.bpm ||
        next.timeSignature !== state.timeSignature ||
        next.volume !== state.volume;
      if (!settingsChanged && next.running === state.running) return;

      state = next;
      if (settingsChanged) saveSettings(storage, state);
      for (const listener of [...listeners]) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function defaultStorage(): StorageLike | undefined {
  try {
    // Reading the global can throw (e.g. storage blocked by the browser).
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export const store = createStore({ storage: defaultStorage() });
