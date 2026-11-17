import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type StorageLike } from './persistence';
import { createStore } from './store';

function fake(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  const setItem = vi.fn((k: string, v: string) => void data.set(k, v));
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem,
  };
  return { storage, setItem };
}

describe('store', () => {
  it('starts with defaults', () => {
    expect(createStore().getState()).toEqual({
      bpm: 120,
      timeSignature: '4/4',
      volume: 80,
      running: false,
    });
  });

  it('clamps and persists volume, ignoring non-finite values', () => {
    const { storage, setItem } = fake();
    const s = createStore({ storage });
    const fn = vi.fn();
    s.subscribe(fn);
    s.setState({ volume: 150 });
    expect(s.getState().volume).toBe(100);
    s.setState({ volume: -5 });
    expect(s.getState().volume).toBe(0);
    s.setState({ volume: Number.NaN });
    expect(s.getState().volume).toBe(0);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(setItem.mock.lastCall![1])).toMatchObject({ volume: 0 });
    expect(createStore({ storage }).getState().volume).toBe(0);
  });

  it('clamps bpm and ignores unknown signatures', () => {
    const s = createStore();
    s.setState({ bpm: 1000 });
    expect(s.getState().bpm).toBe(240);
    s.setState({ timeSignature: '5/4' as never });
    expect(s.getState().timeSignature).toBe('4/4');
  });

  it('notifies once per effective change, not on no-ops', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.setState({ bpm: 100, timeSignature: '3/4', running: true });
    expect(fn).toHaveBeenCalledTimes(1);
    s.setState({ bpm: 100 });
    s.setState({ bpm: 5000 });
    s.setState({ bpm: 5000 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const s = createStore();
    const fn = vi.fn();
    const off = s.subscribe(fn);
    off();
    s.setState({ bpm: 90 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('persists bpm and time signature but not running', () => {
    const { storage, setItem } = fake();
    const s = createStore({ storage });
    s.setState({ running: true });
    expect(setItem).not.toHaveBeenCalled();
    s.setState({ bpm: 90 });
    expect(setItem).toHaveBeenCalledTimes(1);
    s.setState({ timeSignature: '6/8' });
    expect(setItem).toHaveBeenLastCalledWith(
      STORAGE_KEY,
      JSON.stringify({ bpm: 90, timeSignature: '6/8' }),
    );
  });

  it('restores settings but never running', () => {
    const { storage } = fake(
      JSON.stringify({ bpm: 80, timeSignature: '2/4', running: true }),
    );
    expect(createStore({ storage }).getState()).toEqual({
      bpm: 80,
      timeSignature: '2/4',
      volume: 80,
      running: false,
    });
  });

  it('survives a throwing setItem', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    const s = createStore({ storage });
    expect(() => s.setState({ bpm: 90 })).not.toThrow();
    expect(s.getState().bpm).toBe(90);
  });

  it('imports nothing from ui or audio', () => {
    const dir = new URL('.', import.meta.url);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const src = readFileSync(new URL(f, dir), 'utf8');
      expect(src, f).not.toMatch(
        /(?:from\s+|import\s*\(?\s*)['"][^'"]*\/(?:ui|audio)(?:\/|['"])/,
      );
    }
  });
});
