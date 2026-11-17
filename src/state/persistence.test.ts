import { describe, expect, it } from 'vitest';
import {
  loadSettings,
  saveSettings,
  STORAGE_KEY,
  type StorageLike,
} from './persistence';

const defaults = { bpm: 120, timeSignature: '4/4', volume: 80 };

function fake(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('loadSettings', () => {
  it('restores valid values', () => {
    const s = fake(JSON.stringify({ bpm: 90, timeSignature: '6/8' }));
    expect(loadSettings(s)).toEqual({
      bpm: 90,
      timeSignature: '6/8',
      volume: 80,
    });
  });

  it('restores and clamps volume, defaulting a missing or invalid one', () => {
    const load = (v: unknown) =>
      loadSettings(
        fake(JSON.stringify({ bpm: 90, timeSignature: '6/8', volume: v })),
      ).volume;
    expect(load(35)).toBe(35);
    expect(load(250)).toBe(100);
    expect(load(-3)).toBe(0);
    expect(load('40')).toBe(80);
    expect(load(null)).toBe(80);
  });

  it('saves volume', () => {
    const s = fake();
    saveSettings(s, { bpm: 90, timeSignature: '6/8', volume: 25 });
    expect(JSON.parse(s.data.get(STORAGE_KEY)!)).toEqual({
      bpm: 90,
      timeSignature: '6/8',
      volume: 25,
    });
  });

  it('clamps an out-of-range bpm', () => {
    const s = fake(JSON.stringify({ bpm: 999, timeSignature: '3/4' }));
    expect(loadSettings(s)).toEqual({
      bpm: 240,
      timeSignature: '3/4',
      volume: 80,
    });
  });

  it('returns defaults without storage or key', () => {
    expect(loadSettings()).toEqual(defaults);
    expect(loadSettings(fake())).toEqual(defaults);
  });

  it.each(['{not json', 'null', '[1,2]', '"x"'])('defaults for %s', (raw) => {
    expect(loadSettings(fake(raw))).toEqual(defaults);
  });

  it('validates each field independently', () => {
    expect(
      loadSettings(fake(JSON.stringify({ bpm: '90', timeSignature: '6/8' }))),
    ).toEqual({ bpm: 120, timeSignature: '6/8', volume: 80 });
    expect(
      loadSettings(fake(JSON.stringify({ bpm: 90, timeSignature: '5/4' }))),
    ).toEqual({ bpm: 90, timeSignature: '4/4', volume: 80 });
  });

  it('defaults when getItem throws', () => {
    const s: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {},
    };
    expect(loadSettings(s)).toEqual(defaults);
  });
});

describe('saveSettings', () => {
  it('writes exactly bpm, timeSignature and volume', () => {
    const s = fake();
    saveSettings(s, { bpm: 100, timeSignature: '2/4', volume: 80 });
    expect(s.data.get(STORAGE_KEY)).toBe(
      JSON.stringify({ bpm: 100, timeSignature: '2/4', volume: 80 }),
    );
  });

  it('swallows a throwing setItem', () => {
    const s: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(() =>
      saveSettings(s, { bpm: 100, timeSignature: '2/4', volume: 80 }),
    ).not.toThrow();
  });
});
